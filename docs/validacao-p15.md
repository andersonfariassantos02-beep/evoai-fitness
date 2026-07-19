# Validação P1.5 — Curadoria do Banco Mestre

## Habilitar o primeiro administrador

Execute no SQL Editor depois da migração, substituindo o e-mail se necessário:

```sql
insert into public.app_admins (user_id)
select id from auth.users where email = 'anderson.farias.santos.02@gmail.com'
on conflict (user_id) do nothing;
```

## Aceite

- Usuário administrador vê o botão **Catálogo** e abre `/admin/exercicios`.
- Administrador cria, edita, ativa e desativa exercícios.
- Usuário autenticado não cadastrado em `app_admins` recebe acesso restrito.
- Exercício desativado deixa de ser usado em novos treinos, sem apagar o histórico.
- Nenhuma chave `service_role` é usada no frontend.
