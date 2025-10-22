# 🧩 Modular MVC — Boilerplate em TypeScript

Boilerplate estruturado em **TypeScript**, com arquitetura **Modular MVC**, voltado para **aplicações escaláveis, seguras e de fácil manutenção**.

Este projeto adota uma **arquitetura baseada em interfaces e adapters**, garantindo **máximo isolamento de dependências externas**, **alta testabilidade** e **flexibilidade para trocar implementações sem impacto no código de negócio**.

---

## ⚙️ Tecnologias Principais

| Tecnologia       | Função                                                                              |
| ---------------- | ----------------------------------------------------------------------------------- |
| **TypeScript**   | Tipagem estática e segurança em tempo de desenvolvimento.                           |
| **Express.js**   | Framework HTTP leve e flexível.                                                     |
| **Prisma ORM**   | Mapeamento de dados eficiente e tipado.                                             |
| **Zod**          | Validação de dados segura e funcional.                                              |
| **bcrypt + JWT** | Criptografia e autenticação segura com **Refresh Tokens**.                          |
| **Docker**       | Ambientes consistentes e isolados para desenvolvimento e testes.                    |
| **Vitest**       | Framework moderno de testes com alta performance - **100% de cobertura nas rotas**. |
| **Husky**        | Ganchos de commit automatizados para controle de qualidade.                         |

---

## 🧱 Arquitetura Modular MVC

A estrutura segue o padrão **Model-View-Controller**, dividindo responsabilidades de forma clara e modular.

### 🎯 Princípios Arquiteturais

#### 1. **Isolamento de Bibliotecas Externas via Adapters**

Todas as bibliotecas externas (bcrypt, JWT, UUID) são **encapsuladas em adapters**, garantindo que:

- ✅ O código de negócio **nunca importe diretamente** bibliotecas externas
- ✅ Services e Controllers trabalhem com **interfaces simples e claras**
- ✅ Trocas de biblioteca **não exige refatoração** das regras de negócio
- ✅ Testes ficam **extremamente simples**, pois podemos criar vários Stubs à partir de cada interface da classe.
- ✅ **Reduz vendor lock-in** — não ficamos presos a implementações específicas de bibliotecas

**Exemplo de uso:**

Ao invés de importar `bcrypt` diretamente no service, utilizamos um `BcryptAdapter` que implementa a interface `Hasher`. Isso significa que podemos trocar o bcrypt por Argon2, scrypt ou qualquer outra biblioteca sem modificar uma linha sequer dos services.

#### 2. **Interfaces como Contratos de Dependências Externas**

As interfaces servem **exclusivamente para abstrair bibliotecas externas**, permitindo:

- ✅ **Inversão de dependência** — services e controllers dependem de abstrações, não de bibliotecas específicas
- ✅ **Múltiplas implementações** — posso ter `BcryptAdapter`, `ArgonAdapter`, para testes
- ✅ **Testes unitários puros** — sem necessidade de instalar ou configurar bibliotecas reais nos testes
- ✅ **Documentação implícita** — a interface define claramente o que a biblioteca deve fazer
- ✅ **Substituição transparente** — mudar de biblioteca é questão de trocar o adapter injetado

#### 3. **Modularização Completa**

Cada módulo (users, auth, etc...) é **completamente independente**:

- ✅ Possui suas próprias **rotas, controllers, services, repositories**
- ✅ Pode ser **removido ou adicionado** sem afetar outros módulos
- ✅ **Reutilização** de adapters entre módulos via injeção de dependência
- ✅ **Equipes podem trabalhar em paralelo** em módulos diferentes sem conflitos

---

## 🔐 Sistema de Autenticação com Refresh Tokens

O projeto implementa um sistema robusto de autenticação JWT com **refresh tokens**, garantindo:

- ✅ **Access Tokens de curta duração** (15 minutos) para operações cotidianas
- ✅ **Refresh Tokens de longa duração** (7 dias) armazenados de forma segura
- ✅ **Rotação automática de tokens** para máxima segurança
- ✅ **Invalidação de sessões** via controle de refresh tokens no banco
- ✅ **Proteção contra roubo de tokens** (refresh token único e descartável após uso)

### Fluxo de Autenticação

1. **Login** → retorna `accessToken` + `refreshToken`
2. **Requisições** usam `accessToken` no header `Authorization`
3. **Token expirado?** → usa `refreshToken` para gerar novo par de tokens
4. **Refresh token usado é invalidado automaticamente**, gerando um novo

Este sistema garante **segurança sem sacrificar a experiência do usuário**, mantendo sessões ativas por períodos longos sem comprometer a aplicação.

---

## 🧪 Testes Completos com Vitest

**100% das rotas testadas** com Vitest, garantindo qualidade e confiabilidade:

- ✅ **Testes unitários** para controllers, services, repositories e adapters isoladamente
- ✅ **Mocks simples e eficientes** graças aos adapters e interfaces
- ✅ **Cobertura de código** automatizada via `@vitest/coverage-v8`
- ✅ **CI/CD ready** — testes executam automaticamente em pipelines
- ✅ **Performance otimizada** — Vitest é extremamente rápido comparado a Jest

---

## 🚀 Benefícios da Arquitetura

### 🎨 Manutenibilidade Máxima

- Código organizado por **contextos de negócio** (módulos isolados)
- Dependências externas **concentradas em adapters**
- Fácil localização de bugs e implementação de features
- Refatoração segura graças às interfaces bem definidas
- **Zero acoplamento** entre módulos de negócio e bibliotecas

### 🔄 Flexibilidade Excepcional

- **Migrar de bcrypt para Argon2?** Implemente um novo `Hasher`
- **Adicionar Redis para cache?** Crie um `ICacheAdapter`
- **Mudar de JWT para sessões?** Substitua o `JwtAdapter`
- Nenhuma dessas mudanças afeta services, controllers ou repositories

### 🧪 Testabilidade Absoluta

- Testes **não dependem de banco de dados real**
- Bibliotecas externas **facilmente mockadas** via interfaces
- Testes **extremamente rápidos** (sem I/O real)
- **Cobertura completa** sem complexidade
- TDD (Test-Driven Development) é **natural e fluido**

### 📈 Escalabilidade Garantida

- Novos módulos **não afetam código existente**
- Adapters são **reutilizáveis** entre todos os módulos
- Equipes podem trabalhar **paralelamente** sem conflitos
- Preparado para **extração de microsserviços** (módulos já são independentes)
- **Performance consistente** mesmo com crescimento da aplicação

### 🛡️ Segurança em Camadas

- Validação de dados
- Autenticação robusta com **refresh tokens rotativos**
- Senhas **nunca expostas** no código (encapsuladas em BcryptAdapter)
- **Proteção contra ataques comuns** (SQL injection via Prisma, XSS, CSRF)
- Tokens JWT com **expiração curta** para minimizar janela de ataque

### 💡 Produtividade Elevada

- **Onboarding rápido** — estrutura clara e previsível
- **Menos bugs em produção** — testes abrangentes garantem qualidade
- **Reutilização de código** — adapters compartilhados entre módulos
- **Documentação viva** — interfaces servem como contratos claros
- **Menos tempo debugando** — isolamento facilita identificação de problemas

---
