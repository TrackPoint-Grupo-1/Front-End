# Dashboard do Gestor - TrackPoint

## 📊 Visão Geral

O Dashboard do Gestor é uma interface moderna e intuitiva desenvolvida especificamente para gestores e supervisores do sistema TrackPoint. O sistema é composto por 3 telas principais que oferecem uma visão abrangente das métricas de produtividade, gestão de horas extras, controle de projetos e status dos funcionários.

## 🎯 Telas Principais

### 1. **Visão Geral** (`/manager/visao-geral`)
- **Métricas principais** do sistema
- **Status dos funcionários** em tempo real
- **Atividades recentes** e timeline
- **Alertas importantes** categorizados
- **Gráficos de produtividade** por departamento

### 2. **Horas Extras** (`/manager/horas-extras`)
- **Análise de horas extras** por colaborador
- **Ranking de horas extras** mensais
- **Limitação de horas extras** com alertas
- **Distribuição por projetos**
- **Comparação anual** de horas extras
- **Gráficos de tendência** e desvios

### 3. **Horas em Projetos** (`/manager/horas-projeto`)
- **Cadastro e gestão** de projetos
- **Alocação de horas** em treinamentos e reuniões
- **Dashboard por projeto** com filtros
- **Gráficos de progresso** (Curva S)
- **Envolvimento mensal** por colaborador

## 🎨 Características do Design

### Design System
- **Paleta de Cores**: Gradientes modernos com tons de azul e roxo
- **Tipografia**: Inter font family para melhor legibilidade
- **Componentes**: Web Components customizados e reutilizáveis
- **Responsividade**: Design adaptativo para desktop, tablet e mobile
- **Animações**: Transições suaves e micro-interações

### Principais Seções

#### 1. **Header do Dashboard**
- Saudação personalizada com nome do gestor
- Data e hora atualizadas em tempo real
- Ações rápidas (Exportar, Configurações, Novo Funcionário)

#### 2. **Métricas Principais**
- **Funcionários Ativos**: Total de funcionários online
- **Horas Trabalhadas**: Soma das horas do dia
- **Pontos Pendentes**: Ajustes de ponto aguardando aprovação
- **Produtividade**: Indicador geral de performance

#### 3. **Gráficos e Análises**
- Gráfico de barras: Horas por departamento
- Gráfico de linha: Tendência de pontualidade
- Visualizações interativas e responsivas

#### 4. **Gestão de Funcionários**
- Cards individuais com status em tempo real
- Informações de cargo, departamento e horas trabalhadas
- Indicadores visuais de status (online, offline, intervalo)

#### 5. **Atividades Recentes**
- Timeline de eventos importantes
- Notificações de ações dos funcionários
- Histórico de atividades do sistema

#### 6. **Sistema de Alertas**
- Alertas críticos (pontos não batidos)
- Avisos de horas extras
- Notificações de férias pendentes

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5**: Estrutura semântica
- **CSS3**: Estilos modernos com Flexbox e Grid
- **JavaScript ES6+**: Lógica de negócio e interações
- **Web Components**: Componentes customizados reutilizáveis
- **Font Awesome**: Ícones vetoriais
- **Google Fonts**: Tipografia Inter

### Backend Integration
- **Fetch API**: Comunicação com backend
- **Axios**: Cliente HTTP para requisições
- **Cache System**: Sistema de cache para otimização

## 📁 Estrutura de Arquivos

```
manager/
├── visao-geral.html           # Tela Visão Geral
├── horas-extras.html          # Tela Horas Extras
├── horas-projeto.html         # Tela Horas em Projetos
├── styles/
│   └── shared.css             # Estilos compartilhados
├── components/
│   ├── sidebar.js             # Navegação lateral
│   ├── header.js              # Cabeçalho principal
│   ├── metric-card.js         # Componente de métricas
│   ├── chart-card.js          # Componente de gráficos
│   ├── employee-card.js       # Card de funcionário
│   └── quick-action.js        # Botões de ação rápida
├── integration/
│   ├── dashboard-data.js      # Lógica de integração com API
│   └── navigation.js          # Sistema de navegação
└── README.md                  # Este arquivo
```

## 🚀 Como Usar

### Acesso
1. Faça login no sistema com credenciais de gestor
2. O sistema redirecionará automaticamente para `/manager/visao-geral`
3. Acesse via URLs:
   - **Visão Geral**: `http://localhost:3000/manager/visao-geral`
   - **Horas Extras**: `http://localhost:3000/manager/horas-extras`
   - **Horas em Projetos**: `http://localhost:3000/manager/horas-projeto`

### Funcionalidades Principais

#### Visualização de Métricas
- Métricas são atualizadas automaticamente a cada 5 minutos
- Indicadores visuais de tendências (alta, baixa, neutra)
- Cores diferenciadas por tipo de métrica

#### Gestão de Funcionários
- Clique em qualquer card de funcionário para ver detalhes
- Status atualizados em tempo real
- Filtros e busca disponíveis

#### Ações Rápidas
- **Exportar Relatório**: Gera relatório em PDF/Excel
- **Configurações**: Acessa configurações do sistema
- **Novo Funcionário**: Abre formulário de cadastro

#### Sistema de Alertas
- Alertas categorizados por prioridade
- Ações diretas para resolver problemas
- Notificações em tempo real

## 🔧 Personalização

### Cores e Temas
As cores podem ser personalizadas editando as variáveis CSS em `dashboard.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #38a169;
    --warning-color: #dd6b20;
    --danger-color: #e53e3e;
}
```

### Componentes Customizados
Todos os componentes são Web Components e podem ser facilmente modificados:

```javascript
// Exemplo de uso do metric-card
<metric-card 
    title="Nova Métrica" 
    value="100" 
    change="+10%" 
    trend="up" 
    icon="fas fa-star"
    color="purple">
</metric-card>
```

## 📱 Responsividade

O dashboard é totalmente responsivo e se adapta a diferentes tamanhos de tela:

- **Desktop** (>1200px): Layout completo com 4 colunas
- **Tablet** (768px-1200px): Layout adaptado com 2 colunas
- **Mobile** (<768px): Layout em coluna única otimizado

## 🔄 Atualizações Automáticas

- **Dados**: Atualizados a cada 5 minutos
- **Cache**: Sistema inteligente de cache para performance
- **Notificações**: Push notifications para alertas críticos

## 🐛 Solução de Problemas

### Problemas Comuns

1. **Dados não carregam**: Verifique a conexão com o backend
2. **Componentes não aparecem**: Verifique se os scripts estão carregados
3. **Layout quebrado**: Verifique se o CSS está sendo aplicado corretamente

### Debug
Ative o modo debug no console do navegador:
```javascript
localStorage.setItem('debug', 'true');
```

## 🔮 Próximas Funcionalidades

- [ ] Gráficos interativos com Chart.js
- [ ] Filtros avançados de data e departamento
- [ ] Exportação de relatórios personalizados
- [ ] Notificações push em tempo real
- [ ] Modo escuro/claro
- [ ] Dashboard personalizável por usuário

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento ou consulte a documentação técnica do projeto principal.
