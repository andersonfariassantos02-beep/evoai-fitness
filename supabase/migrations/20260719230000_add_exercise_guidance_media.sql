alter table public.exercise_catalog
  add column if not exists instructions text not null default '',
  add column if not exists cautions text[] not null default '{}',
  add column if not exists media_url text,
  add column if not exists equipment_variants text[] not null default '{}';

do $$
begin
  alter table public.exercise_catalog
    add constraint exercise_catalog_media_url_https
    check (media_url is null or media_url ~ '^https://');
exception when duplicate_object then null;
end $$;

update public.exercise_catalog set
  instructions = case key
    when 'chest-press' then 'Ajuste o banco, mantenha as escápulas apoiadas e empurre sem travar os cotovelos.'
    when 'dumbbell-bench' then 'Apoie os pés, estabilize as escápulas e mova os halteres com controle.'
    when 'cable-chest-press' then 'Mantenha o tronco estável e conduza as mãos à frente sem elevar os ombros.'
    when 'row' then 'Mantenha o peito apoiado e puxe levando os cotovelos para trás.'
    when 'cable-row' then 'Preserve a coluna neutra e aproxime a alça do tronco sem impulsionar.'
    when 'dumbbell-row' then 'Apoie o corpo, mantenha a lombar neutra e puxe o halter em direção ao quadril.'
    when 'shoulder-press' then 'Mantenha o tronco apoiado e empurre acima da cabeça sem compensar a lombar.'
    when 'pulldown' then 'Deprima as escápulas e puxe a barra à frente, em direção ao alto do peito.'
    when 'assisted-pullup' then 'Inicie com as escápulas estáveis e suba sem balanço ou impulso.'
    when 'squat-pattern' then 'Mantenha os pés firmes, joelhos alinhados e desça apenas até preservar o controle.'
    when 'leg-press' then 'Apoie toda a planta dos pés e não permita que a lombar se afaste do encosto.'
    when 'goblet-squat' then 'Segure a carga junto ao peito, mantenha o tronco firme e os joelhos alinhados.'
    when 'leg-curl' then 'Ajuste o eixo da máquina ao joelho e flexione sem retirar o quadril do apoio.'
    when 'calf-raise' then 'Use amplitude confortável, suba controladamente e evite quicar no final do movimento.'
    when 'biceps' then 'Mantenha os cotovelos próximos ao tronco e flexione sem balançar o corpo.'
    when 'triceps' then 'Fixe os cotovelos ao lado do tronco e estenda-os sem projetar os ombros.'
    else instructions
  end,
  cautions = case
    when key in ('squat-pattern', 'leg-press') then array['Interrompa se houver dor no joelho ou perda de alinhamento.']
    when key in ('dumbbell-row', 'goblet-squat') then array['Reduza a carga se não conseguir manter a coluna neutra.']
    when key in ('shoulder-press', 'dumbbell-bench') then array['Use amplitude confortável e interrompa em caso de dor no ombro.']
    else array['Interrompa a série diante de dor aguda ou perda de controle.']
  end,
  equipment_variants = case movement
    when 'empurrar-horizontal' then array['máquina', 'halteres', 'cabos']
    when 'puxar-horizontal' then array['máquina', 'halteres', 'cabos']
    when 'puxar-vertical' then array['máquina', 'barra assistida', 'elástico']
    when 'agachar' then array['máquina', 'halteres', 'peso corporal']
    else array[equipment]
  end,
  updated_at = now();
