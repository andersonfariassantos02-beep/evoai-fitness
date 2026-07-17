# Banco de dados do EvoAI Fitness

As mudanças do PostgreSQL ficam versionadas em `migrations/`. Os testes de isolamento por Row Level Security ficam em `tests/`.

## Ambiente local

Pré-requisitos: Docker Desktop em execução e Node.js instalado.

```bash
npx supabase@2.109.1 start
npx supabase@2.109.1 db reset --local
npx supabase@2.109.1 test db --local
```

O reset recria o banco exclusivamente a partir das migrações. Os testes são executados em transação e não preservam os dados artificiais usados nos cenários.

## Projeto remoto

Vincule o diretório ao projeto correto antes de enviar qualquer migração:

```bash
npx supabase@2.109.1 link --project-ref <project-ref>
npx supabase@2.109.1 db push --linked --dry-run
npx supabase@2.109.1 db push --linked
```

Não registre senha do banco, token de acesso, chave secreta nem `service_role` no repositório. O frontend utiliza somente a URL do projeto e a chave publicável.

## Modelo familiar

- `families`: agrupamento familiar e responsável pela criação.
- `family_members`: contas autorizadas e papéis `owner`, `admin` ou `member`.
- `profiles`: pessoas que treinam, com vínculo opcional a uma conta.
- `profile_restrictions`: restrições médicas, lesões, equipamentos e preferências por perfil.

Todas as tabelas públicas possuem RLS. Contas sem vínculo não conseguem consultar dados de outra família; somente `owner` e `admin` administram perfis e restrições.
