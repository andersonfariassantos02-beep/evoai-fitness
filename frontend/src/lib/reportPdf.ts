import type { WorkoutReport } from "../services/reportService";
import type { PersonalRecordHighlight } from "./personalRecord";

function fileName(report: WorkoutReport) {
  return `evoai-relatorio-${report.startDate}-a-${report.endDate}.pdf`;
}

function clean(value: string) {
  return value.replace(/[\u2010-\u2015]/g, "-").replace(/\s+/g, " ").trim();
}

export async function createReportPdf(
  report: WorkoutReport,
  previous: WorkoutReport | null,
  athleteName: string,
  personalRecords: PersonalRecordHighlight[] = [],
) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const width = document.internal.pageSize.getWidth();
  const height = document.internal.pageSize.getHeight();
  const margin = 16;
  let y = 18;

  function ensureSpace(required: number) {
    if (y + required <= height - 16) return;
    document.addPage();
    y = 18;
  }

  function paragraph(value: string, size = 9, color: [number, number, number] = [45, 61, 82]) {
    document.setFont("helvetica", "normal");
    document.setFontSize(size);
    document.setTextColor(...color);
    const lines = document.splitTextToSize(clean(value), width - margin * 2) as string[];
    ensureSpace(lines.length * 4.5 + 3);
    document.text(lines, margin, y);
    y += lines.length * 4.5 + 3;
  }

  document.setFillColor(4, 16, 31);
  document.rect(0, 0, width, 42, "F");
  document.setTextColor(53, 145, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(11);
  document.text("EVOAI FITNESS", margin, 15);
  document.setTextColor(255, 255, 255);
  document.setFontSize(22);
  document.text("Relatorio de treino", margin, 27);
  document.setFontSize(9);
  document.setFont("helvetica", "normal");
  document.text(`${clean(athleteName)} | ${report.startDate} a ${report.endDate}`, margin, 35);
  y = 52;

  const volumeChange = previous?.totalVolume
    ? Math.round(((report.totalVolume - previous.totalVolume) / previous.totalVolume) * 100)
    : null;
  paragraph(`Resumo: ${report.completedSessions} treino(s), ${report.completedSets} series realizadas, ${report.totalReps} repeticoes e ${report.totalVolume.toLocaleString("pt-BR")} kg de volume.`);
  paragraph(`Adesao: ${report.adherence}% | RPE medio: ${report.averageRpe ?? "-"} | Series nao realizadas: ${report.skippedSets}${volumeChange === null ? "" : ` | Variacao de volume: ${volumeChange > 0 ? "+" : ""}${volumeChange}%`}.`, 9, [23, 107, 255]);

  if (report.bodyProgress) {
    ensureSpace(24);
    document.setTextColor(7, 26, 51);
    document.setFont("helvetica", "bold");
    document.setFontSize(13);
    document.text("Evolucao corporal", margin, y);
    y += 7;
    const metrics = [
      ["Peso", report.bodyProgress.weightKg, "kg"],
      ["Gordura corporal", report.bodyProgress.bodyFatPercentage, "%"],
      ["Cintura", report.bodyProgress.waistCm, "cm"],
      ["Peitoral", report.bodyProgress.chestCm, "cm"],
      ["Quadril", report.bodyProgress.hipsCm, "cm"],
      ["Braco", report.bodyProgress.armCm, "cm"],
      ["Coxa", report.bodyProgress.thighCm, "cm"],
    ] as const;
    metrics.forEach(([label, metric, unit]) => {
      if (!metric) return;
      paragraph(
        `${label}: ${metric.initial.toLocaleString("pt-BR")} para ${metric.final.toLocaleString("pt-BR")} ${unit} (${metric.change > 0 ? "+" : ""}${metric.change.toLocaleString("pt-BR")} ${unit})`,
        8,
      );
    });
    paragraph(`${report.bodyProgress.entries.length} registro(s) corporal(is) no periodo.`, 8, [23, 107, 255]);
    y += 2;
  }

  if (personalRecords.length) {
    ensureSpace(24);
    document.setTextColor(7, 26, 51);
    document.setFont("helvetica", "bold");
    document.setFontSize(13);
    document.text("Recordes pessoais do periodo", margin, y);
    y += 7;
    personalRecords.forEach((record) => {
      paragraph(`${record.date} | ${record.exerciseName} | ${record.label}: ${record.value}`, 8, [23, 107, 255]);
    });
    y += 2;
  }

  report.workouts.forEach((workout) => {
    ensureSpace(22);
    document.setFillColor(235, 243, 255);
    document.roundedRect(margin, y, width - margin * 2, 13, 2, 2, "F");
    document.setTextColor(7, 26, 51);
    document.setFont("helvetica", "bold");
    document.setFontSize(11);
    document.text(clean(`${workout.date} | ${workout.label}`), margin + 4, y + 5.5);
    document.setFontSize(8);
    document.setFont("helvetica", "normal");
    document.text(`${workout.completedSets} series | ${workout.volume.toLocaleString("pt-BR")} kg | RPE ${workout.averageRpe ?? "-"}`, margin + 4, y + 10);
    y += 18;

    workout.exercises.forEach((exercise) => {
      ensureSpace(14);
      document.setTextColor(7, 26, 51);
      document.setFont("helvetica", "bold");
      document.setFontSize(9);
      document.text(clean(exercise.name), margin + 2, y);
      y += 4.5;
      if (exercise.bestSet && exercise.estimated1Rm) {
        paragraph(`Melhor serie: ${exercise.bestSet.loadKg} kg x ${exercise.bestSet.reps} | 1RM estimada: ${exercise.estimated1Rm} kg`, 7, [23, 107, 255]);
      }
      const sets = exercise.sets.map((set) => set.skipped
        ? `S${set.setNumber}: nao realizada (${set.skipReason ?? "sem motivo"})`
        : `S${set.setNumber}${set.isExtra ? " extra" : ""}: ${set.loadKg} kg x ${set.reps}${set.rpe === null ? "" : ` | RPE ${set.rpe}`}`
      ).join("   ");
      paragraph(sets, 8, [76, 93, 116]);
      if (exercise.originalKey) paragraph(`Substituicao registrada: ${exercise.substitutionReason ?? "sem motivo informado"}.`, 7, [127, 88, 0]);
    });
    if (workout.sessionRpe || workout.sessionQuality || workout.postWorkoutDiscomfort) {
      paragraph(`Check-out: RPE geral ${workout.sessionRpe ?? "-"} | qualidade ${workout.sessionQuality ?? "-"}/5${workout.postWorkoutDiscomfort ? " | desconforto informado" : ""}`, 8);
    }
    if (workout.notes) paragraph(`Observacoes: ${workout.notes}`, 8);
    y += 2;
  });

  const pages = document.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setTextColor(120, 132, 148);
    document.setFontSize(7);
    document.text(`EvoAI Fitness | Pagina ${page} de ${pages}`, margin, height - 8);
  }

  return { blob: document.output("blob"), name: fileName(report) };
}

export async function saveReportPdf(
  report: WorkoutReport,
  previous: WorkoutReport | null,
  athleteName: string,
  personalRecords: PersonalRecordHighlight[] = [],
) {
  const { blob, name } = await createReportPdf(report, previous, athleteName, personalRecords);
  downloadBlob(blob, name);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function shareReportPdf(
  report: WorkoutReport,
  previous: WorkoutReport | null,
  athleteName: string,
  personalRecords: PersonalRecordHighlight[] = [],
) {
  const { blob, name } = await createReportPdf(report, previous, athleteName, personalRecords);
  const file = new File([blob], name, { type: "application/pdf" });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title: "Relatório EvoAI Fitness", text: `Treinos de ${report.startDate} a ${report.endDate}`, files: [file] });
    return true;
  }
  downloadBlob(blob, name);
  return false;
}
