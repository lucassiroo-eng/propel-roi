export type Stakeholder = "employee" | "hr" | "manager";

export interface LocalizedText {
  en: string;
  es: string;
  fr: string;
  it?: string;
  de?: string;
  pt?: string;
}

export type DiscoveryQuestion = LocalizedText;

export function getLocalized(t: LocalizedText, lang: string): string {
  if (lang.startsWith("es")) return t.es;
  if (lang.startsWith("fr")) return t.fr;
  if (lang.startsWith("it")) return t.it ?? t.en;
  if (lang.startsWith("de")) return t.de ?? t.en;
  if (lang.startsWith("pt")) return t.pt ?? t.en;
  return t.en;
}

export const getQuestion = getLocalized;

export interface ModuleInfo {
  label: LocalizedText;
  description: LocalizedText;
  image?: string;
  color?: string;
  valueProps?: LocalizedText[];
}

export const MODULE_INFO: Record<string, ModuleInfo> = {
  core: {
    label: { en: "Employee Platform / Core", es: "Portal del empleado / Core", fr: "Plateforme Employé / Core", pt: "Core", it: "Employee Platform / Core", de: "Employee Platform / Core" },
    description: { en: "Centralize all employee data and empower your team with self-service", es: "Diseñado para hacerte la vida más fácil y gestionar tus equipos con mayor eficacia", fr: "Centralisez toutes les données employés et donnez l\'autonomie à votre équipe", pt: "Pensado para facilitar a sua vida e gerir as suas equipas de forma mais eficiente", it: "Centralizza i dati dei dipendenti e dai autonomia al team con il self-service", de: "Zentralisieren Sie Mitarbeiterdaten und stärken Sie Ihr Team mit Self-Service" },
    color: "#6B7280",
    image: "/modules/core.png",
    valueProps: [
      { en: "Single source of truth for all employee data", es: "Fuente única de verdad para todos los datos de empleados", fr: "Source unique de vérité pour toutes les données employés", it: "Fonte unica di verità per tutti i dati dei dipendenti", pt: "Fonte única de verdade para todos os dados dos colaboradores", de: "Zentrale Datenquelle für alle Mitarbeiterdaten" },
      { en: "Reduce HR admin with employee self-service", es: "Reduce el trabajo administrativo de RRHH con autoservicio", fr: "Réduisez l'admin RH grâce au libre-service employé", it: "Riduci il lavoro HR con il self-service dei dipendenti", pt: "Reduza a administração de RH com o autoatendimento dos colaboradores", de: "HR-Aufwand reduzieren durch Mitarbeiter-Self-Service" },
      { en: "Automatic notifications and approval workflows", es: "Notificaciones automáticas y flujos de aprobación", fr: "Notifications automatiques et workflows d'approbation", it: "Notifiche automatiche e flussi di approvazione", pt: "Notificações automáticas e fluxos de aprovação", de: "Automatische Benachrichtigungen und Genehmigungsworkflows" },
    ],
  },
  time_off: {
    label: { en: "Time Off", es: "Gestión de ausencias y vacaciones", fr: "Congés", pt: "Gestão de ausências e licenças", it: "Time Off", de: "Time Off" },
    description: { en: "Automate leave management so your team can focus on what matters", es: "Coordina las ausencias de tu equipo sin esfuerzo con un panel unificado", fr: "Automatisez la gestion des congés pour que votre équipe se concentre sur l\'essentiel", pt: "Coordene as ausências da sua equipa com um painel unificado", it: "Automatizza la gestione assenze per concentrarsi su ciò che conta", de: "Automatisieren Sie das Abwesenheitsmanagement für das Wesentliche" },
    color: "#6B7280",
    image: "/modules/time_off.png",
    valueProps: [
      { en: "Employees request and track leave from their phone", es: "Los empleados solicitan y consultan ausencias desde el móvil", fr: "Les employés demandent et suivent leurs congés depuis leur téléphone", it: "I dipendenti richiedono e monitorano le assenze dal telefono", pt: "Os colaboradores solicitam e acompanham ausências pelo telemóvel", de: "Mitarbeiter beantragen und verfolgen Abwesenheiten vom Handy" },
      { en: "Automatic balance calculations and carryover rules", es: "Cálculo automático de saldos y reglas de arrastre", fr: "Calcul automatique des soldes et règles de report", it: "Calcolo automatico dei saldi e regole di riporto", pt: "Cálculo automático de saldos e regras de transferência", de: "Automatische Saldenberechnung und Übertragungsregeln" },
      { en: "Managers approve with one tap, no email chains", es: "Los managers aprueban con un clic, sin cadenas de email", fr: "Les managers approuvent en un clic, sans chaînes d'emails", it: "I manager approvano con un clic, senza catene email", pt: "Os gestores aprovam com um toque, sem cadeias de email", de: "Manager genehmigen mit einem Klick, ohne E-Mail-Ketten" },
    ],
  },
  time_tracking: {
    label: { en: "Time Tracking", es: "Control Horario", fr: "Suivi du Temps", pt: "Controlo de tempo", it: "Time Tracking", de: "Time Tracking" },
    description: { en: "Ensure labor law compliance with effortless clock-in and timesheets", es: "Cumple con la ley, realiza una gestión precisa del tiempo y compensa las horas extra", fr: "Assurez la conformité légale avec un pointage et des feuilles de temps sans effort", pt: "Cumpra a lei com uma gestão rigorosa do tempo e compensação das horas extra", it: "Conformità normativa con timbratura e fogli ore senza sforzo", de: "Arbeitsrechtliche Konformität mit müheloser Zeiterfassung" },
    color: "#6B7280",
    image: "/modules/time_tracking.png",
    valueProps: [
      { en: "One-click clock in from any device", es: "Fichaje con un clic desde cualquier dispositivo", fr: "Pointage en un clic depuis n'importe quel appareil", it: "Timbratura con un clic da qualsiasi dispositivo", pt: "Registo de ponto com um clique a partir de qualquer dispositivo", de: "Ein-Klick-Zeiterfassung von jedem Gerät" },
      { en: "Automatic overtime calculation and alerts", es: "Cálculo automático de horas extra y alertas", fr: "Calcul automatique des heures sup et alertes", it: "Calcolo automatico straordinari e avvisi", pt: "Cálculo automático de horas extra e alertas", de: "Automatische Überstundenberechnung und Warnungen" },
      { en: "Direct sync with payroll for zero errors", es: "Sincronización directa con nóminas sin errores", fr: "Synchronisation directe avec la paie sans erreurs", it: "Sincronizzazione diretta con paghe, zero errori", pt: "Sincronização direta com o processamento salarial sem erros", de: "Direkte Synchronisation mit der Lohnabrechnung, null Fehler" },
    ],
  },
  time_planning: {
    label: { en: "Shift Management", es: "Gestión de turnos", fr: "Gestion des Plannings", pt: "Gestão de turnos", it: "Shift Management", de: "Shift Management" },
    description: { en: "Plan shifts and rotations visually keeping your team aligned", es: "Transforma la gestión de turnos con herramientas de planificación intuitivas y fáciles de usar", fr: "Planifiez les rotations visuellement en gardant votre équipe alignée", pt: "Transforme a gestão de turnos com ferramentas de planeamento intuitivas e fáceis de usar", it: "Pianifica turni e rotazioni visivamente mantenendo il team allineato", de: "Planen Sie Schichten visuell und halten Sie Ihr Team ausgerichtet" },
    color: "#2563EB",
    image: "/modules/time_planning.png",
    valueProps: [
      { en: "Drag-and-drop shift planning", es: "Planificación de turnos con arrastrar y soltar", fr: "Planification des plannings par glisser-déposer", it: "Pianificazione turni drag-and-drop", pt: "Planeamento de turnos com arrastar e soltar", de: "Drag-and-Drop-Schichtplanung" },
      { en: "Automatic conflict detection and coverage alerts", es: "Detección automática de conflictos y alertas de cobertura", fr: "Détection automatique des conflits et alertes de couverture", it: "Rilevamento automatico conflitti e avvisi di copertura", pt: "Deteção automática de conflitos e alertas de cobertura", de: "Automatische Konflikterkennung und Deckungswarnungen" },
    ],
  },
  payroll: {
    label: { en: "Payroll Connect", es: "Integración nóminas", fr: "Paie", pt: "Nóminas", it: "Payroll Connect", de: "Payroll Connect" },
    description: { en: "Sync HR data to payroll automatically — no more manual re-entry", es: "Sincroniza los movimientos y datos creados en Factorial en tu programa de nómina", fr: "Synchronisez les données RH avec la paie automatiquement — plus de saisie manuelle", pt: "Sincronize os dados de RH com o processamento salarial automaticamente — sem reintrodução manual", it: "Sincronizza i dati HR con le paghe automaticamente — niente più inserimento manuale", de: "Synchronisieren Sie HR-Daten automatisch mit der Lohnabrechnung" },
    color: "#FB923C",
    image: "/modules/payroll.png",
    valueProps: [
      { en: "One-click payroll data sync", es: "Sincronización de datos de nómina con un clic", fr: "Synchronisation des données de paie en un clic", it: "Sincronizzazione dati paghe con un clic", pt: "Sincronização de dados salariais com um clique", de: "Ein-Klick-Lohndatensynchronisation" },
      { en: "Track and manage variable pay components", es: "Controla y gestiona los componentes variables de nómina", fr: "Suivez et gérez les composantes variables de la paie", it: "Gestisci i componenti variabili della retribuzione", pt: "Controle e gira os componentes variáveis do processamento salarial", de: "Variable Gehaltsbestandteile verwalten" },
    ],
  },
  recruitment: {
    label: { en: "Recruitment", es: "Reclutamiento", fr: "Recrutement", pt: "Recrutamento", it: "Ricerca e selezione", de: "Recruitment" },
    description: { en: "Attract and hire top talent with a streamlined pipeline", es: "Contrata el mejor talento sin perder ni un segundo y sin salir de la plataforma", fr: "Attirez et recrutez les meilleurs talents avec un pipeline optimisé", pt: "Contrate os melhores talentos rapidamente, sem sair da plataforma", it: "Assumi i migliori talenti in pochissimo tempo, senza mai uscire dalla piattaforma", de: "Stellen Sie Top-Talente in kurzer Zeit ein ohne die Plattform zu verlassen" },
    color: "#E05C75",
    image: "/modules/recruitment.png",
    valueProps: [
      { en: "Post to multiple job boards in one click", es: "Publica en múltiples portales de empleo con un clic", fr: "Publiez sur plusieurs job boards en un clic", it: "Pubblica su più portali con un clic", pt: "Publique em múltiplos portais de emprego com um clique", de: "Mit einem Klick auf mehreren Jobbörsen veröffentlichen" },
      { en: "Collaborative hiring with structured scorecards", es: "Contratación colaborativa con scorecards estructurados", fr: "Recrutement collaboratif avec des grilles d'évaluation", it: "Collaborative hiring with structured scorecards", pt: "Recrutamento colaborativo com scorecards estruturados", de: "Collaborative hiring with structured scorecards" },
    ],
  },
  performance: {
    label: { en: "Performance", es: "Gestión de Desempeño", fr: "Performance", pt: "Gestão do Desempenho", it: "Gestione delle performance", de: "Performance" },
    description: { en: "Drive growth with structured reviews goals and continuous feedback", es: "Crea una cultura de feedback continuo y detecta el potencial de tu equipo", fr: "Favorisez la croissance avec des évaluations des objectifs et du feedback continu", pt: "Crie uma cultura de feedback contínuo e identifique o potencial da sua equipa", it: "Crea una cultura del feedback continuo e identifica il potenziale del tuo team", de: "Erschaffen Sie eine kontinuierliche Feedback-Kultur und identifizieren Sie das Potenzial Ihres Teams" },
    color: "#E05C75",
    image: "/modules/performance.png",
    valueProps: [
      { en: "Customizable review cycles and templates", es: "Ciclos de evaluación y plantillas personalizables", fr: "Cycles d'évaluation et modèles personnalisables", it: "Customizable review cycles and templates", pt: "Ciclos de avaliação e modelos personalizáveis", de: "Customizable review cycles and templates" },
      { en: "Goal tracking with OKR alignment", es: "Seguimiento de objetivos con alineación OKR", fr: "Suivi des objectifs avec alignement OKR", it: "Goal tracking with OKR alignment", pt: "Acompanhamento de objetivos com alinhamento OKR", de: "Goal tracking with OKR alignment" },
    ],
  },
  expenses: {
    label: { en: "Expenses", es: "Gastos", fr: "Notes de Frais", pt: "Despesas", it: "Spese", de: "Ausgaben" },
    description: { en: "Simplify expense management from submission to reimbursement", es: "Automatiza los gastos, elimina el trabajo administrativo y mantén el control", fr: "Simplifiez la gestion des frais de la soumission au remboursement", pt: "Automatize as despesas, elimine o trabalho administrativo e mantenha o controlo", it: "Automatizza le spese, elimina il lavoro amministrativo e mantieni il controllo", de: "Automatisieren Sie Ausgaben, eliminieren Sie administrative Arbeit und behalten Sie die Kontrolle" },
    color: "#14B8A6",
    image: "/modules/expenses.png",
    valueProps: [
      { en: "Snap a receipt and submit in seconds", es: "Foto del ticket y envío en segundos", fr: "Photographiez le reçu et soumettez en quelques secondes", it: "Snap a receipt and submit in seconds", pt: "Fotografe o recibo e submeta em segundos", de: "Snap a receipt and submit in seconds" },
      { en: "Automatic policy validation and approval flows", es: "Validación automática de política y flujos de aprobación", fr: "Validation automatique de la politique et workflows d'approbation", it: "Automatic policy validation and approval flows", pt: "Validação automática de políticas e fluxos de aprovação", de: "Automatic policy validation and approval flows" },
    ],
  },
  trainings: {
    label: { en: "Training", es: "Formaciones", fr: "Formation", pt: "Formações", it: "Formazione", de: "Schulungen" },
    description: { en: "Keep your team skilled and compliant with structured training plans", es: "Lleva el conocimiento de tu equipo al siguiente nivel con el módulo de formaciones", fr: "Gardez votre équipe formée et conforme avec des plans de formation structurés", pt: "Leve o conhecimento da sua equipa ao próximo nível com o nosso módulo de formação", it: "Porta le conoscenze del tuo team al livello successivo con il nostro modulo di formazione", de: "Bringen Sie das Wissen Ihres Teams mit unserem Modul Schulungen aufs nächste Level" },
    color: "#E05C75",
    image: "/modules/trainings.png",
    valueProps: [
      { en: "Track mandatory training completion automatically", es: "Seguimiento automático de formación obligatoria", fr: "Suivi automatique des formations obligatoires", it: "Track mandatory training completion automatically", pt: "Acompanhamento automático da conclusão de formação obrigatória", de: "Track mandatory training completion automatically" },
      { en: "Centralized training catalog with enrollment", es: "Catálogo de formación centralizado con inscripción", fr: "Catalogue de formation centralisé avec inscription", it: "Centralized training catalog with enrollment", pt: "Catálogo de formação centralizado com inscrição", de: "Centralized training catalog with enrollment" },
    ],
  },
  compensations: {
    label: { en: "Compensation", es: "Compensación", fr: "Rémunération", pt: "Compensação", it: "Compensi", de: "Vergütung" },
    description: { en: "Run salary reviews with data fairness and budget control", es: "Simplifica la gestión de la compensación, y evita errores en la nómina", fr: "Menez les revues salariales avec données équité y contrôle budgétaire", pt: "Simplifique a gestão de compensações e evite erros nos recibos de vencimento", it: "Semplifica la gestione dei compensi ed evita errori in busta paga", de: "Vereinfachen Sie Vergütungs-Management und verhindern Sie Gehaltsabrechnungsfehler" },
    color: "#FB923C",
    image: "/modules/compensations.png",
    valueProps: [
      { en: "Salary benchmarking against market data", es: "Benchmarking salarial con datos de mercado", fr: "Benchmarking salarial avec des données de marché", it: "Salary benchmarking against market data", pt: "Benchmarking salarial com dados de mercado", de: "Salary benchmarking against market data" },
      { en: "Budget control with real-time impact simulation", es: "Control presupuestario con simulación de impacto en tiempo real", fr: "Contrôle budgétaire avec simulation d'impact en temps réel", it: "Budget control with real-time impact simulation", pt: "Controlo orçamental com simulação de impacto em tempo real", de: "Budget control with real-time impact simulation" },
    ],
  },
  engagement: {
    label: { en: "Engagement", es: "Engagement", fr: "Engagement", pt: "Engagement", it: "Coinvolgimento", de: "Engagement" },
    description: { en: "Measure and improve team satisfaction with pulse surveys and eNPS", es: "Crea y promueve un mejor entorno de trabajo para mejorar la fidelización en tus equipos", fr: "Mesurez et améliorez la satisfaction de votre équipe avec des enquêtes pulse y eNPS", pt: "Crie e promova um mejor ambiente de trabajo para melhorar a retenção das suas equipas", it: "Crea e promuovi un ambiente di lavoro migliore per migliorare la fidelizzazione dei tuoi team", de: "Schaffen und fördern Sie ein besseres Arbeitsumfeld, um die Mitarbeiterbindung in Ihren Teams zu verbessern." },
    color: "#E05C75",
    image: "/modules/engagement.png",
    valueProps: [
      { en: "Automated pulse surveys with trend analysis", es: "Encuestas pulse automáticas con análisis de tendencias", fr: "Enquêtes pulse automatisées avec analyse des tendances", it: "Automated pulse surveys with trend analysis", pt: "Inquéritos pulse automáticos com análise de tendências", de: "Automated pulse surveys with trend analysis" },
      { en: "Anonymous feedback that drives real action", es: "Feedback anónimo que impulsa acciones reales", fr: "Feedback anonyme qui génère de vraies actions", it: "Anonymous feedback that drives real action", pt: "Feedback anónimo que impulsiona ações concretas", de: "Anonymous feedback that drives real action" },
    ],
  },
  procurement: {
    label: { en: "Procurement", es: "Gestión de Compras", fr: "Achats", pt: "Gestão de compras", it: "Approvvigionamento", de: "Beschaffungsmanagement" },
    description: { en: "Streamline purchase requests with approvals and budget tracking", es: "Controla el gasto, automatiza solicitudes de compra y evita el exceso de gastos", fr: "Rationalisez les demandes d\'achat avec approbations et suivi budgétaire", pt: "Controle os gastos antes de acontecerem, automatize pedidos de compra e evite gastos excessivos", it: "Controlla le spese prima che si verifichino, automatizza le richieste d\'acquisto ed evita spese eccessive", de: "Kontrollieren Sie Ausgaben, automatisieren Sie Kaufanfragen und verhindern Sie Budgetüberschreitung" },
    color: "#14B8A6",
    image: "/modules/procurement.png",
    valueProps: [
      { en: "Streamline purchase approvals with multi-level workflows", es: "Agiliza las aprobaciones de compra con flujos multinivel", fr: "Simplifiez les approbations d'achat avec des workflows multi-niveaux", it: "Streamline purchase approvals with multi-level workflows", pt: "Agilize as aprovações de compra com fluxos multinível", de: "Streamline purchase approvals with multi-level workflows" },
      { en: "Control budgets in real time and avoid unauthorized spending", es: "Controla los presupuestos en tiempo real y evita gastos no autorizados", fr: "Contrôlez les budgets en temps réel et évitez les dépenses non autorisées", it: "Control budgets in real time and avoid unauthorized spending", pt: "Controle os orçamentos em tempo real e evite gastos não autorizados", de: "Control budgets in real time and avoid unauthorized spending" },
      { en: "Centralize all purchase requests and track their status in one place", es: "Centraliza todas las solicitudes de compra y controla su estado desde un único lugar", fr: "Centralisez toutes les demandes d'achat et suivez leur statut en un seul endroit", it: "Centralize all purchase requests and track their status in one place", pt: "Centralize todos os pedidos de compra e acompanhe o seu estado num único lugar", de: "Centralize all purchase requests and track their status in one place" },
    ],
  },
  projects: {
    label: { en: "Projects", es: "Gestión de Proyectos", fr: "Projets", pt: "Gestão de projetos", it: "Gestione progetti", de: "Projektmanagement" },
    description: { en: "Track time by project and optimize team allocation", es: "Maximiza la rentabilidad de tus proyectos con una gestión ágil y conectada", fr: "Suivez le temps par projet et optimisez l\'allocation de l\'équipe", pt: "Planeie de forma mais inteligente, acompanhe custos e transforme projetos em lucro", it: "Pianifica in modo più intelligente, tieni traccia dei costi e trasforma i progetti in profitto", de: "Planen Sie smarter, tracken Sie Kosten und verwandeln Sie Projekte in Profit" },
    color: "#14B8A6",
    image: "/modules/projects.png",
    valueProps: [
      { en: "Track time and costs per project with full precision", es: "Controla el tiempo y los costes por proyecto con total precisión", fr: "Suivez le temps et les coûts par projet avec une précision totale", it: "Track time and costs per project with full precision", pt: "Controle o tempo e os custos por projeto com total precisão", de: "Track time and costs per project with full precision" },
      { en: "Analyze labor costs, fixed costs and expenses in real time", es: "Analiza costes laborales, costes fijos y gastos en tiempo real", fr: "Analysez les coûts de main-d'œuvre, les coûts fixes et les dépenses en temps réel", it: "Analyze labor costs, fixed costs and expenses in real time", pt: "Analise custos laborais, custos fixos e despesas em tempo real", de: "Analyze labor costs, fixed costs and expenses in real time" },
      { en: "Optimize team allocation and detect budget overruns early", es: "Optimiza la asignación del equipo y detecta desviaciones de presupuesto a tiempo", fr: "Optimisez l'allocation des équipes et détectez les dépassements budgétaires à temps", it: "Optimize team allocation and detect budget overruns early", pt: "Otimize a alocação da equipa e detete desvios orçamentais atempadamente", de: "Optimize team allocation and detect budget overruns early" },
    ],
  },
  headcount_planning: {
    label: { en: "Headcount Planning", es: "Planificación de plantilla", fr: "Planification des Effectifs", pt: "Planeamento de headcount", it: "Pianificazione del personale", de: "Personalplanung" },
    description: { en: "Plan your workforce strategically with position management", es: "Planifica, aprueba y haz seguimiento de cada contratación en un espacio de trabajo compartido", fr: "Planifiez vos effectifs stratégiquement avec la gestion des postes", pt: "Planeie, aprove e acompanhe cada contratação num espacio de trabajo partilhado.", it: "Pianifica, approva e monitora ogni assunzione in uno spazio di lavoro condiviso.", de: "Planen, genehmigen und verfolgen Sie jede Einstellung in einem gemeinsamen Workspace." },
    color: "#8B5CF6",
    image: "/modules/headcount_planning.png",
    valueProps: [
      { en: "Plan your org structure with open positions and hiring forecasts", es: "Planifica tu estructura organizativa con posiciones abiertas y previsiones de contratación", fr: "Planifiez votre structure organisationnelle avec postes ouverts et prévisions de recrutement", it: "Plan your org structure with open positions and hiring forecasts", pt: "Planeie a estrutura organizacional com posições abertas e previsões de contratação", de: "Plan your org structure with open positions and hiring forecasts" },
      { en: "Align headcount with budget and business goals", es: "Alinea la plantilla con el presupuesto y los objetivos del negocio", fr: "Alignez les effectifs avec le budget et les objectifs de l'entreprise", it: "Align headcount with budget and business goals", pt: "Alinhe o headcount com o orçamento e os objetivos de negócio", de: "Align headcount with budget and business goals" },
      { en: "Get a clear view of current and future workforce composition", es: "Obtén una visión clara de la composición actual y futura de tu plantilla", fr: "Obtenez une vision claire de la composition actuelle et future de vos effectifs", it: "Get a clear view of current and future workforce composition", pt: "Obtenha uma visão clara da composição atual e futura da força de trabalho", de: "Get a clear view of current and future workforce composition" },
    ],
  },
  lms: {
    label: { en: "LMS", es: "LMS", fr: "LMS", pt: "LMS", it: "LMS", de: "LMS" },
    description: { en: "Create and deliver training content with built-in tracking", es: "Centraliza el aprendizaje, automatiza el progreso y facilita el crecimiento.", fr: "Créez et distribuez du contenu de formation avec suivi intégré", pt: "Centraliza a aprendizagem, automatiza o progresso e torna o crescimento simples.", it: "Centralizza l\'apprendimento, automatizza i progressi e semplifica la crescita.", de: "Zentralisieren Sie das Lernen, automatisieren Sie den Fortschritt und vereinfachen Sie das Wachstum." },
    color: "#E05C75",
    image: "/modules/lms.png",
    valueProps: [
      { en: "Create, assign and track training content from one platform", es: "Crea, asigna y controla contenido formativo desde una sola plataforma", fr: "Créez, assignez et suivez le contenu de formation depuis une seule plateforme", it: "Create, assign and track training content from one platform", pt: "Crie, atribua e acompanhe conteúdo formativo a partir de uma única plataforma", de: "Create, assign and track training content from one platform" },
      { en: "Automate course enrollment based on role, team or onboarding", es: "Automatiza la inscripción a cursos por rol, equipo o proceso de onboarding", fr: "Automatisez les inscriptions aux formations par rôle, équipe ou onboarding", it: "Automate course enrollment based on role, team or onboarding", pt: "Automatize a inscrição em cursos com base no cargo, equipa ou integração", de: "Automate course enrollment based on role, team or onboarding" },
      { en: "Monitor completion rates and track employee skill development", es: "Controla las tasas de finalización y el desarrollo de competencias de tu equipo", fr: "Suivez les taux de complétion et le développement des compétences de vos équipes", it: "Monitor completion rates and track employee skill development", pt: "Monitorize as taxas de conclusão e o desenvolvimento de competências", de: "Monitor completion rates and track employee skill development" },
    ],
  },
  complaints: {
    label: { en: "Trust Channel", es: "Canal Seguro", fr: "Canal de Confiance", pt: "Canal seguro", it: "Canale di segnalazione", de: "Sichere Meldestelle" },
    description: { en: "Comply with regulations and offer an internal space to report irregularities", es: "Cumple con la normativa y ofrece un espacio interno para reportar irregularidades", fr: "Conformez-vous à la réglementation et offrez un espace interne pour signaler les irrégularités", pt: "Cumpra a regulamentação e disponibilize un espacio interno para reportar irregularidades", it: "Rispetta le normative e offri uno spazio interno per segnalare irregolarità", de: "Halten Sie Vorschriften ein und bieten Sie Raum für den Bericht von Unregelmäßigkeiten" },
    image: "/modules/complaints.png",
    color: "#EF4444",
    valueProps: [
      { en: "Avoid sanctions and protect your company's reputation", es: "Evita sanciones y mantén la reputación e imagen de tu empresa", fr: "Évitez les sanctions et protégez la réputation de votre entreprise", it: "Avoid sanctions and protect your company's reputation", pt: "Evite sanções e proteja a reputação da sua empresa", de: "Avoid sanctions and protect your company's reputation" },
      { en: "Integrate an anonymous and secure channel that complies with GDPR", es: "Integra un canal de denuncias anónimo y seguro que cumple con la GDPR", fr: "Intégrez un canal de signalement anonyme et sécurisé conforme au RGPD", it: "Integrate an anonymous and secure channel that complies with GDPR", pt: "Integre um canal de denúncias anónimo e seguro que cumpre o RGPD", de: "Integrate an anonymous and secure channel that complies with GDPR" },
      { en: "Provide a good experience for your team and avoid workplace climate issues", es: "Proporciona una buena experiencia a tu equipo y evita problemas de clima laboral", fr: "Offrez une bonne expérience à votre équipe et évitez les problèmes de climat social", it: "Provide a good experience for your team and avoid workplace climate issues", pt: "Proporcione uma boa experiência à equipa e evite problemas de clima organizacional", de: "Provide a good experience for your team and avoid workplace climate issues" },
    ],
  },
  benefits_standard: {
    label: { en: "Benefits", es: "Beneficios", fr: "Avantages", pt: "Benefícios", it: "Benefit", de: "Benefits" },
    description: { en: "Improve your team\'s experience with flexible benefits", es: "Mejora la experiencia de tu equipo con la retribución flexible", fr: "Améliorez l\'expérience de votre équipe avec les avantages flexibles", pt: "Melhore a experiencia da sua equipa com benefícios flexíveis", it: "Migliora l\'esperienza del tuo team con benefit flessibili", de: "Verbessern Sie die Erfahrung Ihres Teams mit flexiblen Benefits" },
    color: "#F59E0B",
    image: "/modules/benefits_standard.png",
    valueProps: [
      { en: "Offer a modern benefits package to attract and retain talent without increasing salary costs", es: "Ofrece un paquete de beneficios moderno y competitivo para atraer y retener talento sin aumentar costes salariales", fr: "Offrez un package d'avantages modernes pour attirer et retenir les talents sans augmenter les coûts salariaux", it: "Offer a modern benefits package to attract and retain talent without increasing salary costs", pt: "Ofereça um pacote de benefícios moderno para atrair e reter talentos sem aumentar custos salariais", de: "Offer a modern benefits package to attract and retain talent without increasing salary costs" },
      { en: "Increase team satisfaction by letting employees spend on what they truly value", es: "Aumenta la satisfacción del equipo permitiendo a los empleados gastar en lo que realmente valoran", fr: "Augmentez la satisfaction de l'équipe en laissant les employés dépenser sur ce qui compte pour eux", it: "Increase team satisfaction by letting employees spend on what they truly value", pt: "Aumente a satisfação da equipa permitindo que os colaboradores gastem no que realmente valorizam", de: "Increase team satisfaction by letting employees spend on what they truly value" },
      { en: "Ensure tax compliance and manage enrollments, cancellations and limits from one place", es: "Garantiza el cumplimiento fiscal y gestiona altas, bajas y límites de consumo sin fricciones desde un único lugar", fr: "Garantissez la conformité fiscale et gérez les inscriptions, résiliations et limites depuis un seul endroit", it: "Ensure tax compliance and manage enrollments, cancellations and limits from one place", pt: "Garanta conformidade fiscal e gira inscrições, cancelamentos e limites a partir de um único lugar", de: "Ensure tax compliance and manage enrollments, cancellations and limits from one place" },
    ],
  },
  benefits: {
    label: { en: "Salary Advance", es: "Anticipo de Nómina", fr: "Avance sur Salaire", pt: "Adiantamento de Salário", it: "Anticipo stipendio", de: "Gehaltsvorschuss" },
    description: { en: "Give employees on-demand access to their earned salary", es: "Da a tus empleados acceso inmediato a su salario ya devengado", fr: "Donnez à vos employés un accès instantané à leur salaire déjà gagné", pt: "Dê aos colaboradores acceso imediato ao salário já ganho", it: "Consenti ai dipendenti l\'accesso immediato allo stipendio già maturato", de: "Geben Sie Mitarbeitern sofortigen Zugriff auf ihr bereits verdientes Gehalt" },
    color: "#F59E0B",
    valueProps: [
      { en: "Reduce financial stress without any impact on company cash flow", es: "Reduce el estrés financiero de tus empleados sin impactar la tesorería de la empresa", fr: "Réduisez le stress financier sans impact sur la trésorerie de l'entreprise", it: "Reduce financial stress without any impact on company cash flow", pt: "Reduza o stress financeiro dos colaboradores sem impacto no fluxo de caixa da empresa", de: "Reduce financial stress without any impact on company cash flow" },
      { en: "100% digital, instant and fully integrated with payroll", es: "100% digital, inmediato y totalmente integrado con nómina", fr: "100% digital, instantané et entièrement intégré à la paie", it: "100% digital, instant and fully integrated with payroll", pt: "100% digital, imediato e totalmente integrado com o processamento salarial", de: "100% digital, instant and fully integrated with payroll" },
      { en: "Improve employee retention and satisfaction as a key benefit", es: "Mejora la retención y satisfacción del empleado como beneficio diferencial", fr: "Améliorez la rétention et la satisfaction des employés comme avantage clé", it: "Improve employee retention and satisfaction as a key benefit", pt: "Melhore a retenção e satisfação dos colaboradores como benefício diferenciador", de: "Improve employee retention and satisfaction as a key benefit" },
    ],
  },
  space: {
    label: { en: "Spaces", es: "Gestión de Espacios", fr: "Espaces", pt: "Gestão de espaços", it: "Gestione spazi", de: "Raummanagement" },
    description: { en: "Manage office occupancy and desk booking with full visibility", es: "Gestiona reservas de zonas y oficinas, y saca el máximo partido a tu espacio de trabajo", fr: "Gérez l\'occupation du bureau et la réservation de postes avec une visibilité totale", pt: "Gira reservas de áreas e escritórios e tire o máximo partido do seu espacio de trabajo", it: "Gestisci le prenotazioni di aree e uffici e sfrutta al massimo il tuo spazio di lavoro", de: "Verwalten Sie Raum- und Büroreservierungen und nutzen Sie Ihren Arbeitsplatz optimal" },
    color: "#0D9488",
    image: "/modules/space.png",
    valueProps: [
      { en: "Employees book desks and rooms from their phone in seconds", es: "Los empleados reservan puestos y salas desde el móvil en segundos", fr: "Les employés réservent postes et salles depuis leur téléphone en quelques secondes", it: "Employees book desks and rooms from their phone in seconds", pt: "Os colaboradores reservam mesas e salas pelo telemóvel em segundos", de: "Employees book desks and rooms from their phone in seconds" },
      { en: "See who's coming to the office each day to plan team days", es: "Visualiza quién viene a la oficina cada día para organizar días de equipo", fr: "Visualisez qui vient au bureau chaque jour pour planifier les journées d'équipe", it: "See who's coming to the office each day to plan team days", pt: "Veja quem vem ao escritório cada dia para planear os dias de equipa", de: "See who's coming to the office each day to plan team days" },
      { en: "Occupancy analytics to optimize real estate and reduce costs", es: "Analíticas de ocupación para optimizar el espacio y reducir costes inmobiliarios", fr: "Analyses d'occupation pour optimiser les espaces et réduire les coûts immobiliers", it: "Occupancy analytics to optimize real estate and reduce costs", pt: "Análise de ocupação para otimizar espaços e reduzir custos imobiliários", de: "Occupancy analytics to optimize real estate and reduce costs" },
    ],
  },
  it_inventory: {
    label: { en: "IT Inventory", es: "Inventario de IT", fr: "Inventaire IT", pt: "Inventário de TI", it: "Inventario IT", de: "IT-Inventar" },
    description: { en: "Keep track of every device and automate provisioning on hire and exit", es: "Creación, edición, asignación y baja mediante flujos estructurados", fr: "Suivez chaque appareil et automatisez le provisionnement à l\'entrée et à la sortie", pt: "Ganhe visibilidade e controlo sobre os ativos de TI", it: "Ottieni visibilità e controllo completi sugli asset IT della tua azienda", de: "Behalten Sie den Überblick über jedes Gerät und automatisieren Sie die Bereitstellung" },
    color: "#0D9488",
    image: "/modules/it_inventory.png",
    valueProps: [
      { en: "Centralised asset register linked to each employee profile", es: "Registro centralizado de activos vinculado al perfil de cada empleado", fr: "Registre d'actifs centralisé lié au profil de chaque employé", it: "Centralised asset register linked to each employee profile", pt: "Ganhe visibilidade e controlo sobre os ativos de TI", de: "Centralised asset register linked to each employee profile" },
      { en: "Auto-provision equipment and access on day one for new hires", es: "Aprovisiona equipos y accesos automáticamente el primer día para nuevas incorporaciones", fr: "Approvisionnez automatiquement équipements et accès dès le premier jour pour les nouvelles recrues", it: "Auto-provision equipment and access on day one for new hires", pt: "Automatize o aprovisionamento de equipamento na entrada e saída de colaboradores", de: "Auto-provision equipment and access on day one for new hires" },
      { en: "Auto-deprovision on exit — no forgotten accounts or unreturned assets", es: "Desaprovisiona automáticamente en la baja — sin cuentas olvidadas ni activos sin devolver", fr: "Désapprovisionnement automatique à la sortie — aucun compte oublié ni actif non rendu", it: "Auto-deprovision on exit — no forgotten accounts or unreturned assets", de: "Auto-deprovision on exit — no forgotten accounts or unreturned assets" },
    ],
  },
  one: {
    label: { en: "Factorial One (AI)", es: "Factorial One (IA)", fr: "Factorial One (IA)", pt: "Factorial One (IA)", it: "Factorial One (IA)", de: "Factorial One (KI)" },
    description: { en: "Let AI answer your team\'s HR questions instantly 24/7", es: "El agente de IA que multiplica tu potencial", fr: "Laissez l\'IA répondre instantanément aux questions RH de votre équipe 24h/24", pt: "Deixe a IA responder instantaneamente às perguntas de RH da sua equipa 24/7", it: "Lascia che l\'IA risponda istantaneamente alle domande HR del tuo team 24/7", de: "Lassen Sie die KI die HR-Fragen Ihres Teams sofort und rund um die Uhr beantworten" },
    color: "#E05C75",
    image: "/modules/one.png",
    valueProps: [
      { en: "Instant answers to HR questions: policies, balances, processes", es: "Respuestas instantáneas a preguntas de RRHH: políticas, saldos, procesos", fr: "Réponses instantanées aux questions RH : politiques, soldes, processus", it: "Instant answers to HR questions: policies, balances, processes", pt: "Respostas instantâneas a perguntas de RH, 24/7, sem intervenção humana", de: "Instant answers to HR questions: policies, balances, processes" },
      { en: "Reduce HR inbox volume by up to 40% from day one", es: "Reduce el volumen del buzón de RRHH hasta un 40% desde el primer día", fr: "Réduisez le volume de la boîte RH jusqu'à 40% dès le premier jour", it: "Reduce HR inbox volume by up to 40% from day one", pt: "Reduza a carga de trabalho de RH automatizando consultas rotineiras", de: "Reduce HR inbox volume by up to 40% from day one" },
      { en: "Available 24/7 in the employee's own language", es: "Disponible 24/7 en el idioma del empleado", fr: "Disponible 24h/24 dans la langue de l'employé", it: "Available 24/7 in the employee's own language", de: "Available 24/7 in the employee's own language" },
    ],
  },
  integration_business_central: {
    label: { en: "Business Central", es: "Business Central", fr: "Business Central", pt: "Business Central", it: "Business Central", de: "Business Central" },
    description: { en: "Sync HR data with Microsoft Business Central automatically", es: "Sincroniza los datos de RRHH con Microsoft Business Central de forma automática", fr: "Synchronisez les données RH avec Microsoft Business Central automatiquement", pt: "Sincronize automaticamente os dados de RH com o Microsoft Business Central", it: "Sincronizza automaticamente i dati HR con Microsoft Business Central", de: "Synchronisieren Sie HR-Daten automatisch mit Microsoft Business Central" },
    color: "#6366F1",
    valueProps: [
      { en: "Eliminate manual data entry between HR and your ERP", es: "Elimina la introducción manual de datos entre RRHH y tu ERP", fr: "Éliminez la saisie manuelle entre les RH et votre ERP", it: "Eliminate manual data entry between HR and your ERP", pt: "Sincronização automática de dados entre Factorial e Business Central elimina reintrodução manual", de: "Eliminate manual data entry between HR and your ERP" },
      { en: "Bi-directional sync keeps both systems always aligned", es: "Sincronización bidireccional que mantiene ambos sistemas siempre alineados", fr: "Synchronisation bidirectionnelle pour garder les deux systèmes toujours alignés", it: "Bi-directional sync keeps both systems always aligned", pt: "Reduza erros e poupe horas de RH em cada ciclo de processamento com Business Central", de: "Bi-directional sync keeps both systems always aligned" },
    ],
  },
  integration_netsuite: {
    label: { en: "NetSuite", es: "NetSuite", fr: "NetSuite", pt: "NetSuite", it: "NetSuite", de: "NetSuite" },
    description: { en: "Connect Factorial with Oracle NetSuite for seamless HR-finance data flow", es: "Conecta Factorial con Oracle NetSuite para un flujo de datos RRHH-finanzas sin fricciones", fr: "Connectez Factorial à Oracle NetSuite pour un flux de données RH-finance sans friction", pt: "Ligue o Factorial ao Oracle NetSuite para um flujo de dados de RH e finanças sem fricções", it: "Collega Factorial con Oracle NetSuite per un flusso di dati HR-finanza senza attriti", de: "Verbinden Sie Factorial mit Oracle NetSuite für einen reibungslosen HR-Finanz-Datenfluss" },
    color: "#6366F1",
    valueProps: [
      { en: "Employee and payroll data synced automatically with NetSuite", es: "Datos de empleados y nómina sincronizados automáticamente con NetSuite", fr: "Données employés et paie synchronisées automatiquement avec NetSuite", it: "Employee and payroll data synced automatically with NetSuite", pt: "Sincronização automática de dados entre Factorial e NetSuite elimina reintrodução manual", de: "Employee and payroll data synced automatically with NetSuite" },
      { en: "Single source of truth across HR and finance", es: "Fuente única de verdad para RRHH y finanzas", fr: "Source unique de vérité pour les RH et la finance", it: "Single source of truth across HR and finance", pt: "Reduza erros e poupe horas de RH em cada ciclo de processamento com NetSuite", de: "Single source of truth across HR and finance" },
    ],
  },
  integration_sage_200: {
    label: { en: "SAGE 200", es: "SAGE 200", fr: "SAGE 200", pt: "SAGE 200", it: "SAGE 200", de: "SAGE 200" },
    description: { en: "Direct integration between Factorial and SAGE 200 for payroll and accounting", es: "Integración directa entre Factorial y SAGE 200 para nóminas y contabilidad", fr: "Intégration directa entre Factorial y SAGE 200 para nóminas y contabilidad", pt: "Integração direta entre o Factorial e o SAGE 200 para recibos de vencimento e contabilidade", it: "Integrazione diretta tra Factorial e SAGE 200 per paghe e contabilità", de: "Direkte Integration zwischen Factorial und SAGE 200 für Gehaltsabrechnung und Buchhaltung" },
    color: "#6366F1",
    valueProps: [
      { en: "No more manual exports between HR and accounting", es: "Sin más exportaciones manuales entre RRHH y contabilidad", fr: "Plus d'exports manuels entre les RH et la comptabilité", it: "No more manual exports between HR and accounting", pt: "Sincronização automática de dados entre Factorial e Sage 200 elimina reintrodução manual", de: "No more manual exports between HR and accounting" },
      { en: "Payroll and headcount data always up to date in SAGE", es: "Datos de nómina y plantilla siempre actualizados en SAGE", fr: "Données de paie et effectifs toujours à jour dans SAGE", it: "Payroll and headcount data always up to date in SAGE", pt: "Reduza erros e poupe horas de RH em cada ciclo de processamento com Sage 200", de: "Payroll and headcount data always up to date in SAGE" },
    ],
  },
  integration_milena: {
    label: { en: "Milena", es: "Milena", fr: "Milena", pt: "Milena", it: "Milena", de: "Milena" },
    description: { en: "Automate payroll data transfer between Factorial and Milena", es: "Automatiza la transferencia de datos de nómina entre Factorial y Milena", fr: "Automatisez le transfert de données de paie entre Factorial et Milena", pt: "Automatize a transferência de dados salariais entre o Factorial e o Milena", it: "Automatizza il trasferimento dei dati paghe tra Factorial e Milena", de: "Automatisieren Sie die Übertragung von Gehaltsdaten zwischen Factorial und Milena" },
    color: "#6366F1",
    valueProps: [
      { en: "Automated payroll data sync every pay cycle", es: "Sincronización automática de datos de nómina cada ciclo", fr: "Synchronisation automatique des données de paie à chaque cycle", it: "Automated payroll data sync every pay cycle", pt: "Sincronização automática de dados entre Factorial e Milena elimina reintrodução manual", de: "Automated payroll data sync every pay cycle" },
      { en: "Eliminate manual re-entry and reduce payroll errors", es: "Elimina la re-introducción manual y reduce errores de nómina", fr: "Éliminez la re-saisie manuelle et réduisez les erreurs de paie", it: "Eliminate manual re-entry and reduce payroll errors", pt: "Reduza erros e poupe horas de RH em cada ciclo de processamento com Milena", de: "Eliminate manual re-entry and reduce payroll errors" },
    ],
  },
  integration_suprema_xiptic: {
    label: { en: "Suprema / Xiptic", es: "Suprema / Xiptic", fr: "Suprema / Xiptic", pt: "Suprema / Xiptic", it: "Suprema / Xiptic", de: "Suprema / Xiptic" },
    description: { en: "Connect biometric attendance terminals directly to Factorial", es: "Conecta los terminales de fichaje biométrico directamente con Factorial", fr: "Connectez les terminaux de pointage biométrique directamente à Factorial", pt: "Ligue os terminais biométricos de assiduidade diretamente ao Factorial", it: "Collega i terminali di rilevazione presenze biometrici direttamente a Factorial", de: "Verbinden Sie biometrische Zeiterfassungsterminals direkt mit Factorial" },
    color: "#6366F1",
    valueProps: [
      { en: "Clock-in data from terminals flows automatically into Factorial", es: "Los datos de fichaje de los terminales fluyen automáticamente a Factorial", fr: "Les données de pointage des terminaux arrivent automatiquement dans Factorial", it: "Clock-in data from terminals flows automatically into Factorial", pt: "Sincronização automática de dados entre Factorial e Suprema/Xiptic elimina reintrodução manual", de: "Clock-in data from terminals flows automatically into Factorial" },
      { en: "No manual data export or reconciliation needed", es: "Sin necesidad de exportación manual ni conciliación", fr: "Aucune exportation manuelle ni réconciliation nécessaire", it: "No manual data export or reconciliation needed", pt: "Reduza erros e poupe horas de RH em cada ciclo de processamento com Suprema/Xiptic", de: "No manual data export or reconciliation needed" },
    ],
  },
  silae: {
    label: { en: "SILAE", es: "SILAE", fr: "SILAE", pt: "SILAE", it: "SILAE", de: "SILAE" },
    description: { en: "Sync Factorial with SILAE for seamless payroll processing in France", es: "Sincroniza Factorial con SILAE para una gestión de nóminas sin fricciones en Francia", fr: "Synchronisez Factorial avec SILAE pour un traitement de la paie sans friction en France", pt: "Sincronize o Factorial com o SILAE para um processamento salarial sem fricções em França", it: "Sincronizza Factorial con SILAE per un\'elaborazione delle paghe senza attriti in Francia", de: "Synchronisieren Sie Factorial mit SILAE für eine reibungslose Lohnabrechnung in Frankreich" },
    color: "#6366F1",
    valueProps: [
      { en: "Direct payroll data sync with your SILAE provider", es: "Sincronización directa de datos de nómina con tu proveedor SILAE", fr: "Synchronisation directe des données de paie avec votre prestataire SILAE", it: "Direct payroll data sync with your SILAE provider", pt: "Sincronização automática de dados entre Factorial e SILAE elimina reintrodução manual", de: "Direct payroll data sync with your SILAE provider" },
      { en: "Reduce payroll prep time and eliminate manual file transfers", es: "Reduce el tiempo de preparación de nómina y elimina las transferencias de ficheros manuales", fr: "Réduisez le temps de préparation de la paie et éliminez les transferts de fichiers manuels", it: "Reduce payroll prep time and eliminate manual file transfers", pt: "Reduza erros e poupe horas de RH em cada ciclo de processamento com SILAE", de: "Reduce payroll prep time and eliminate manual file transfers" },
    ],
  },
};

export const DISCOVERY_QUESTIONS: Record<
  string,
  Partial<Record<Stakeholder, DiscoveryQuestion[]>>
> = {
  core: {
    employee: [{ en: "How many minutes per month do you spend on HR admin (updating personal data, requesting documents, checking policies)?", es: "¿Cuántos minutos al mes dedicáis a gestiones de RRHH (actualizar datos, pedir documentos, consultar políticas)?", fr: "Combien de minutes par mois passez-vous sur l'admin RH (mise à jour de données, demandes de documents, consultation des politiques) ?", it: "I vostri dipendenti hanno mai vissuto stress finanziario tra uno stipendio e l'altro che ha influito sulla loro concentrazione?", de: "Haben Ihre Mitarbeiter jemals finanziellen Stress zwischen den Gehaltsterminen erlebt, der ihre Arbeitskonzentration beeinträchtigte?", pt: "Os colaboradores já experienciaram stress financeiro entre pagamentos que afetou a sua concentração no trabalho?" }],
    hr: [{ en: "How many hours does your HR team spend per new hire (onboarding admin, profile setup, documentation, access setup)?", es: "¿Cuántas horas dedica el equipo de RRHH a cada nueva incorporación (alta, configuración del perfil, documentación, accesos)?", fr: "Combien d'heures votre équipe RH consacre-t-elle à chaque nouvelle recrue (onboarding admin, création du profil, documentation, accès) ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e Silae?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und Silae?", pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e Silae?" }],
    manager: [{ en: "How much time per month do you lose looking for team info (contracts, org chart, headcount)?", es: "¿Cuánto tiempo al mes perdéis buscando info de vuestro equipo (contratos, organigrama, plantilla)?", fr: "Combien de temps par mois perdez-vous à chercher les infos de votre équipe (contrats, organigramme, effectifs) ?", it: "Quanto tempo al mese i manager dedicano alla gestione di conflitti di team o problemi di conformità?", de: "Wie viel Zeit pro Monat verbringen Ihre Manager mit Teamkonflikten oder Compliance-Problemen?", pt: "Quanto tempo por mês dedicam os gestores a resolver conflitos de equipa ou questões de conformidade?" }],
  },
  time_off: {
    employee: [{ en: "How many minutes does it take you to request a day off and check your balance?", es: "¿Cuántos minutos tardáis en solicitar un día libre y consultar vuestro saldo?", fr: "Combien de minutes vous faut-il pour poser un congé et consulter votre solde ?", it: "Quanti minuti ci vogliono per richiedere un giorno libero e consultare il saldo?", de: "Wie viele Minuten brauchen Sie, um einen freien Tag zu beantragen und Ihr Guthaben zu prüfen?" , pt: "Quantos minutos demoram a solicitar um dia de folga e a consultar o saldo?"}],
    hr: [{ en: "How many hours per month does leave management take (balances, carryover, policy exceptions)?", es: "¿Cuántas horas al mes os lleva la gestión de ausencias (saldos, arrastres, excepciones)?", fr: "Combien d'heures par mois prend la gestion des congés (soldes, reports, exceptions) ?", it: "Quante ore al mese richiede la gestione delle assenze (saldi, riporto, eccezioni)?", de: "Wie viele Stunden pro Monat beansprucht die Abwesenheitsverwaltung (Salden, Übertrag, Ausnahmen)?" , pt: "Quantas horas por mês leva a gestão de ausências (saldos, transferências, exceções)?"}],
    manager: [{ en: "How much time per month do you spend reviewing and approving leave requests?", es: "¿Cuánto tiempo al mes dedicáis a revisar y aprobar solicitudes de ausencia?", fr: "Combien de temps par mois passez-vous à examiner et approuver les demandes de congés ?", it: "Quanto tempo al mese dedicate a revisionare e approvare le richieste di assenza?", de: "Wie viel Zeit pro Monat verbringen Sie mit Überprüfung und Genehmigung von Abwesenheitsanträgen?" , pt: "Quanto tempo por mês dedicam a rever e aprovar pedidos de ausência?"}],
  },
  time_tracking: {
    employee: [{ en: "How many minutes per day do you spend logging your hours?", es: "¿Cuántos minutos al día dedicáis a registrar vuestras horas?", fr: "Combien de minutes par jour passez-vous à enregistrer vos heures ?", it: "Quanti minuti al giorno dedicate alla registrazione delle vostre ore?", de: "Wie viele Minuten täglich verbringen Sie mit dem Erfassen Ihrer Stunden?" , pt: "Quantos minutos por dia dedicam ao registo das horas?"}],
    hr: [{ en: "How many hours per month does timesheet collection and payroll reconciliation take?", es: "¿Cuántas horas al mes os lleva recopilar fichajes y cuadrar con nóminas?", fr: "Combien d'heures par mois prennent la collecte des feuilles de temps et le rapprochement avec la paie ?", it: "Quante ore al mese richiede la raccolta delle timbrature e il quadro con le paghe?", de: "Wie viele Stunden pro Monat kostet Sie die Zeiterfassungssammlung und der Lohnabgleich?" , pt: "Quantas horas por mês leva a recolher registos de ponto e conciliar com os salários?"}],
    manager: [{ en: "How much time per month do you spend reviewing timesheets and chasing missing entries?", es: "¿Cuánto tiempo al mes dedicáis a revisar fichajes y perseguir los que faltan?", fr: "Combien de temps par mois passez-vous à vérifier les feuilles de temps et relancer les retardataires ?", it: "Quanto tempo al mese dedicate a revisionare le timbrature e sollecitare quelle mancanti?", de: "Wie viel Zeit pro Monat verbringen Sie mit Überprüfung von Zeiterfassungen und dem Nachfassen fehlender Einträge?" , pt: "Quanto tempo por mês dedicam a rever registos de ponto e perseguir os que faltam?"}],
  },
  time_planning: {
    employee: [{ en: "How many minutes per week do you spend checking your schedule or coordinating swaps?", es: "¿Cuántos minutos a la semana dedicáis a consultar vuestro turno o coordinar cambios?", fr: "Combien de minutes par semaine passez-vous à consulter votre planning ou coordonner des échanges ?", it: "Quanti minuti alla settimana dedicate a consultare il turno o coordinare i cambi?", de: "Wie viele Minuten pro Woche verbringen Sie damit, Ihren Schichtplan zu prüfen oder Tausche zu koordinieren?" , pt: "Quantos minutos por semana dedicam a consultar o turno ou coordenar trocas?"}],
    hr: [{ en: "How many hours per month does shift planning and communication take?", es: "¿Cuántas horas al mes os lleva planificar y comunicar los turnos?", fr: "Combien d'heures par mois prennent la planification et la communication des plannings ?", it: "Quante ore al mese richiede la pianificazione e comunicazione dei turni?", de: "Wie viele Stunden pro Monat nimmt die Schichtplanung und -kommunikation in Anspruch?" , pt: "Quantas horas por mês leva a planear e comunicar os turnos?"}],
    manager: [{ en: "How much time per month do you spend building schedules and managing coverage?", es: "¿Cuánto tiempo al mes dedicáis a crear horarios y gestionar coberturas?", fr: "Combien de temps par mois passez-vous à construire les plannings et gérer les remplacements ?", it: "Quanto tempo al mese dedicate a creare i turni e gestire la copertura?", de: "Wie viel Zeit pro Monat verbringen Sie mit der Erstellung von Dienstplänen und der Verwaltung von Abdeckungen?" , pt: "Quanto tempo por mês dedicam a criar horários e gerir coberturas?"}],
  },
  payroll: {
    hr: [{ en: "How many hours does each payroll run take from data prep to close?", es: "¿Cuántas horas os lleva cada ciclo de nómina desde la preparación hasta el cierre?", fr: "Combien d'heures prend chaque cycle de paie, de la préparation à la clôture ?", it: "Quante ore richiede ogni ciclo di payroll dalla preparazione alla chiusura?", de: "Wie viele Stunden dauert jeder Lohnabrechnungszyklus von der Vorbereitung bis zum Abschluss?" , pt: "Quantas horas leva cada ciclo de processamento salarial desde a preparação até ao fecho?"}],
    manager: [{ en: "How much time per month do you spend communicating variable pay or payroll changes?", es: "¿Cuánto tiempo al mes dedicáis a comunicar variables de nómina o cambios salariales?", fr: "Combien de temps par mois passez-vous à communiquer les variables de paie ou les changements ?", it: "Quanto tempo al mese dedicate a comunicare le variabili di paga o le modifiche salariali?", de: "Wie viel Zeit pro Monat verbringen Sie mit der Kommunikation von Lohnvariablen oder Gehaltsänderungen?" , pt: "Quanto tempo por mês dedicam a comunicar variáveis salariais ou alterações de remuneração?"}],
  },
  recruitment: {
    hr: [{ en: "How many hours per month does managing job postings, screening, and pipeline take?", es: "¿Cuántas horas al mes os lleva gestionar ofertas, cribado y pipeline de candidatos?", fr: "Combien d'heures par mois prennent la gestion des offres, le tri et le suivi du pipeline ?", it: "Quante ore al mese richiede la gestione delle offerte, lo screening e il pipeline dei candidati?", de: "Wie viele Stunden pro Monat kostet Sie die Verwaltung von Stellenanzeigen, Screening und Kandidaten-Pipeline?" , pt: "Quantas horas por mês leva a gerir ofertas, triagem e pipeline de candidatos?"}],
    manager: [{ en: "How much time per month do you spend on hiring tasks (interviews, feedback, coordination)?", es: "¿Cuánto tiempo al mes dedicáis a tareas de selección (entrevistas, feedback, coordinación)?", fr: "Combien de temps par mois passez-vous sur le recrutement (entretiens, retours, coordination) ?", it: "Quanto tempo al mese dedicate alle attività di selezione (colloqui, feedback, coordinamento)?", de: "Wie viel Zeit pro Monat verbringen Sie mit Einstellungsaufgaben (Vorstellungsgespräche, Feedback, Koordination)?" , pt: "Quanto tempo por mês dedicam a tarefas de recrutamento (entrevistas, feedback, coordenação)?"}],
  },
  performance: {
    employee: [{ en: "How many hours per review cycle do you spend preparing self-evaluations?", es: "¿Cuántas horas por ciclo de evaluación dedicáis a preparar vuestra autoevaluación?", fr: "Combien d'heures par cycle d'évaluation passez-vous à préparer votre auto-évaluation ?", it: "Quante ore per ciclo di valutazione dedicate alla preparazione dell'autovalutazione?", de: "Wie viele Stunden pro Bewertungszyklus verbringen Sie mit der Vorbereitung Ihrer Selbsteinschätzung?" , pt: "Quantas horas por ciclo de avaliação dedicam a preparar a autoavaliação?"}],
    hr: [{ en: "How many hours per cycle does managing the review process take (setup, reminders, reports)?", es: "¿Cuántas horas por ciclo os lleva gestionar el proceso de evaluación (configuración, recordatorios, informes)?", fr: "Combien d'heures par cycle prend la gestion du processus d'évaluation (configuration, relances, rapports) ?", it: "Quante ore per ciclo richiede la gestione del processo di valutazione (configurazione, promemoria, report)?", de: "Wie viele Stunden pro Zyklus kostet Sie die Verwaltung des Bewertungsprozesses (Setup, Erinnerungen, Berichte)?" , pt: "Quantas horas por ciclo leva a gerir o processo de avaliação (configuração, lembretes, relatórios)?"}],
    manager: [{ en: "How much time per cycle do you spend writing evaluations and giving feedback?", es: "¿Cuánto tiempo por ciclo dedicáis a redactar evaluaciones y dar feedback?", fr: "Combien de temps par cycle passez-vous à rédiger les évaluations et donner du feedback ?", it: "Quanto tempo per ciclo dedicate alla redazione delle valutazioni e alla comunicazione del feedback?", de: "Wie viel Zeit pro Zyklus verbringen Sie mit dem Schreiben von Bewertungen und Feedback?" , pt: "Quanto tempo por ciclo dedicam a redigir avaliações e dar feedback?"}],
  },
  expenses: {
    employee: [{ en: "How many minutes does it take to submit an expense report?", es: "¿Cuántos minutos tardáis en presentar una nota de gastos?", fr: "Combien de minutes faut-il pour soumettre une note de frais ?", it: "Quanti minuti ci vogliono per presentare una nota spese?", de: "Wie viele Minuten dauert es, eine Spesenabrechnung einzureichen?" , pt: "Quantos minutos demoram a submeter uma nota de despesas?"}],
    hr: [{ en: "How many hours per month does expense validation and reconciliation take?", es: "¿Cuántas horas al mes os lleva validar y conciliar los gastos?", fr: "Combien d'heures par mois prennent la validation et le rapprochement des notes de frais ?", it: "Quante ore al mese richiede la validazione e la riconciliazione delle spese?", de: "Wie viele Stunden pro Monat kostet Sie die Validierung und Abstimmung von Ausgaben?" , pt: "Quantas horas por mês leva a validar e conciliar as despesas?"}],
    manager: [{ en: "How much time per month do you spend reviewing and approving expense reports?", es: "¿Cuánto tiempo al mes dedicáis a revisar y aprobar notas de gastos?", fr: "Combien de temps par mois passez-vous à examiner et approuver les notes de frais ?", it: "Quanto tempo al mese dedicate a revisionare e approvare le note spese?", de: "Wie viel Zeit pro Monat verbringen Sie mit Überprüfung und Genehmigung von Spesenabrechnungen?" , pt: "Quanto tempo por mês dedicam a rever e aprovar notas de despesas?"}],
  },
  trainings: {
    employee: [{ en: "How many hours per month do you spend on training admin (finding courses, registering, tracking)?", es: "¿Cuántas horas al mes dedicáis a admin de formación (buscar cursos, inscribiros, seguimiento)?", fr: "Combien d'heures par mois passez-vous sur l'admin formation (recherche, inscription, suivi) ?", it: "Quante ore al mese dedicate all'admin della formazione (ricerca corsi, iscrizione, monitoraggio)?", de: "Wie viele Stunden pro Monat verbringen Sie mit Schulungsadmin (Kurse suchen, anmelden, verfolgen)?" , pt: "Quantas horas por mês dedicam à administração de formação (procurar cursos, inscrever-se, acompanhamento)?"}],
    hr: [{ en: "How many hours per month does managing the training plan and compliance tracking take?", es: "¿Cuántas horas al mes os lleva gestionar el plan de formación y el seguimiento de cumplimiento?", fr: "Combien d'heures par mois prennent la gestion du plan de formation et le suivi de conformité ?", it: "Quante ore al mese richiede la gestione del piano formativo e il monitoraggio della conformità?", de: "Wie viele Stunden pro Monat kostet Sie die Verwaltung des Schulungsplans und die Compliance-Nachverfolgung?" , pt: "Quantas horas por mês leva a gerir o plano de formação e o acompanhamento do cumprimento?"}],
    manager: [{ en: "How much time per month do you spend identifying and coordinating training for your team?", es: "¿Cuánto tiempo al mes dedicáis a identificar y coordinar formación para vuestro equipo?", fr: "Combien de temps par mois passez-vous à identifier et coordonner la formation de votre équipe ?", it: "Quanto tempo al mese dedicate a identificare e coordinare la formazione per il team?", de: "Wie viel Zeit pro Monat verbringen Sie damit, Schulungen für Ihr Team zu identifizieren und zu koordinieren?" , pt: "Quanto tempo por mês dedicam a identificar e coordenar formação para a equipa?"}],
  },
  compensations: {
    hr: [{ en: "How many hours does each salary review cycle take?", es: "¿Cuántas horas os lleva cada ciclo de revisión salarial?", fr: "Combien d'heures prend chaque cycle de revue salariale ?", it: "Quante ore richiede ogni ciclo di revisione salariale?", de: "Wie viele Stunden dauert jeder Gehaltsüberprüfungszyklus?" , pt: "Quantas horas leva cada ciclo de revisão salarial?"}],
    manager: [{ en: "How much time per review cycle do you spend on compensation decisions for your team?", es: "¿Cuánto tiempo por ciclo dedicáis a decisiones de compensación de vuestro equipo?", fr: "Combien de temps par cycle passez-vous sur les décisions de rémunération de votre équipe ?", it: "Quanto tempo per ciclo dedicate alle decisioni di compensazione del vostro team?", de: "Wie viel Zeit pro Zyklus verbringen Sie mit Vergütungsentscheidungen für Ihr Team?" , pt: "Quanto tempo por ciclo dedicam a decisões de compensação da equipa?"}],
  },
  engagement: {
    hr: [{ en: "How many hours per month does running surveys and analyzing results take?", es: "¿Cuántas horas al mes os lleva lanzar encuestas y analizar resultados?", fr: "Combien d'heures par mois prennent le lancement des enquêtes et l'analyse des résultats ?", it: "Quante ore al mese richiede il lancio dei sondaggi e l'analisi dei risultati?", de: "Wie viele Stunden pro Monat kostet Sie das Durchführen von Umfragen und die Ergebnisanalyse?" , pt: "Quantas horas por mês leva a lançar inquéritos e analisar resultados?"}],
    manager: [{ en: "How much time per month do you spend gathering and acting on team feedback?", es: "¿Cuánto tiempo al mes dedicáis a recoger y actuar sobre el feedback de vuestro equipo?", fr: "Combien de temps par mois passez-vous à recueillir le feedback de votre équipe et à agir dessus ?", it: "Quanto tempo al mese dedicate a raccogliere il feedback del team e ad agire di conseguenza?", de: "Wie viel Zeit pro Monat verbringen Sie damit, Team-Feedback zu sammeln und darauf zu reagieren?" , pt: "Quanto tempo por mês dedicam a recolher e agir sobre o feedback da equipa?"}],
  },
  procurement: {
    hr: [{ en: "How many hours per month does processing purchase requests take?", es: "¿Cuántas horas al mes os lleva procesar solicitudes de compra?", fr: "Combien d'heures par mois prend le traitement des demandes d'achat ?", it: "Quante ore al mese richiede l'elaborazione delle richieste di acquisto?", de: "Wie viele Stunden pro Monat kostet Sie die Bearbeitung von Kaufanfragen?" , pt: "Quantas horas por mês leva a processar pedidos de compra?"}],
    manager: [{ en: "How much time per month do you spend on purchase requests and tracking?", es: "¿Cuánto tiempo al mes dedicáis a solicitudes de compra y seguimiento?", fr: "Combien de temps par mois passez-vous sur les demandes d'achat et leur suivi ?", it: "Quanto tempo al mese dedicate alle richieste di acquisto e al loro monitoraggio?", de: "Wie viel Zeit pro Monat verbringen Sie mit Kaufanfragen und deren Nachverfolgung?" , pt: "Quanto tempo por mês dedicam a pedidos de compra e acompanhamento?"}],
  },
  projects: {
    employee: [{ en: "How many minutes per day do you spend logging time to projects?", es: "¿Cuántos minutos al día dedicáis a imputar tiempo a proyectos?", fr: "Combien de minutes par jour passez-vous à saisir du temps sur les projets ?", it: "Quanti minuti al giorno dedicate all'imputazione del tempo sui progetti?", de: "Wie viele Minuten täglich verbringen Sie damit, Zeit auf Projekte zu buchen?" , pt: "Quantos minutos por dia dedicam a imputar tempo a projetos?"}],
    manager: [{ en: "How much time per month do you spend tracking project hours and team allocation?", es: "¿Cuánto tiempo al mes dedicáis a controlar horas de proyecto y asignación del equipo?", fr: "Combien de temps par mois passez-vous à suivre les heures projet et l'allocation de l'équipe ?", it: "Quanto tempo al mese dedicate al controllo delle ore di progetto e all'allocazione del team?", de: "Wie viel Zeit pro Monat verbringen Sie mit der Verfolgung von Projektstunden und der Teamzuordnung?" , pt: "Quanto tempo por mês dedicam a controlar horas de projeto e alocação da equipa?"}],
  },
  headcount_planning: {
    hr: [{ en: "How many hours per month does headcount planning and position tracking take?", es: "¿Cuántas horas al mes os lleva la planificación de plantilla y seguimiento de posiciones?", fr: "Combien d'heures par mois prennent la planification des effectifs et le suivi des postes ?", it: "Quante ore al mese richiede la pianificazione dell'organico e il monitoraggio delle posizioni?", de: "Wie viele Stunden pro Monat kostet Sie die Personalplanung und Positionsverfolgung?" , pt: "Quantas horas por mês leva o planeamento de headcount e acompanhamento de posições?"}],
    manager: [{ en: "How much time per quarter do you spend forecasting hiring needs?", es: "¿Cuánto tiempo por trimestre dedicáis a prever necesidades de contratación?", fr: "Combien de temps par trimestre passez-vous à prévoir vos besoins en recrutement ?", it: "Quanto tempo per trimestre dedicate alla previsione delle esigenze di assunzione?", de: "Wie viel Zeit pro Quartal verbringen Sie mit der Prognose Ihres Einstellungsbedarfs?" , pt: "Quanto tempo por trimestre dedicam a prever necessidades de contratação?"}],
  },
  it_inventory: {
    hr: [{ en: "How many hours does your HR team spend provisioning equipment and access for each new hire (laptop setup, accounts, badges)?", es: "¿Cuántas horas dedica vuestro equipo de RRHH a gestionar el material y los accesos necesarios para cada nueva incorporación (portátil, cuentas, tarjetas)?", fr: "Combien d'heures votre équipe RH consacre-t-elle à provisionner le matériel et les accès pour chaque nouvelle recrue (PC, comptes, badges) ?", it: "Quante ore dedica il team HR alla gestione delle attrezzature e degli accessi per ogni nuovo assunto (laptop, account, badge)?", de: "Wie viele Stunden verbringt Ihr HR-Team mit der Bereitstellung von Geräten und Zugängen für jeden neuen Mitarbeiter (Laptop, Konten, Ausweise)?" , pt: "Quantas horas dedica a equipa de RH a gerir equipamento e acessos para cada nova contratação (portátil, contas, cartões)?"}],
  },
  integration_business_central: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Business Central?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Business Central?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Business Central ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e Business Central?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und Business Central?" , pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e Business Central?"}],
  },
  integration_netsuite: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and NetSuite?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y NetSuite?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et NetSuite ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e NetSuite?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und NetSuite?" , pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e NetSuite?"}],
  },
  integration_sage_200: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Sage 200?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Sage 200?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Sage 200 ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e Sage 200?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und Sage 200?" , pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e Sage 200?"}],
  },
  integration_sap: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and SAP?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y SAP?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et SAP ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e SAP?", pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e SAP?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und SAP?" }],
  },
  integration_datev: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and DATEV?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y DATEV?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et DATEV ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e DATEV?", pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e DATEV?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und DATEV?" }],
  },
  integration_a3: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and A3?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y A3?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et A3 ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e A3?", pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e A3?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und A3?" }],
  },
  integration_xero: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Xero?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Xero?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Xero ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e Xero?", pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e Xero?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und Xero?" }],
  },
  integration_quickbooks: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and QuickBooks?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y QuickBooks?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et QuickBooks ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e QuickBooks?", pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e QuickBooks?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und QuickBooks?" }],
  },
  integration_milena: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Milena?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Milena?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Milena ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e Milena?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und Milena?" , pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e Milena?"}],
  },
  integration_suprema_xiptic: {
    hr: [{ en: "How many hours per month do you spend syncing data with your access control system?", es: "¿Cuántas horas al mes dedicáis a sincronizar datos con vuestro sistema de control de acceso?", fr: "Combien d'heures par mois passez-vous à synchroniser les données avec votre système de contrôle d'accès ?", it: "Quante ore al mese dedicate alla sincronizzazione dei dati con il sistema di controllo accessi?", de: "Wie viele Stunden pro Monat verbringen Sie mit der Datensynchronisation mit Ihrem Zutrittskontrollsystem?" , pt: "Quantas horas por mês dedicam a sincronizar dados com o sistema de controlo de acesso?"}],
  },
  silae: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Silae?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Silae?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Silae ?", it: "Quante ore al mese dedicate all'inserimento manuale di dati tra HR e Silae?", de: "Wie viele Stunden pro Monat verbringen Sie mit manueller Dateneingabe zwischen HR und Silae?" , pt: "Quantas horas por mês dedicam à introdução manual de dados entre RH e Silae?"}],
  },
  complaints: {
    hr: [
      { en: "How much time per month does your HR team spend handling complaints through informal channels (email, in-person)?", es: "¿Cuánto tiempo al mes dedica vuestro equipo de RRHH a gestionar quejas o denuncias por canales informales (email, en persona)?", fr: "Combien de temps par mois votre équipe RH consacre-t-elle à traiter les plaintes par des canaux informels (email, en personne) ?", it: "How much time per month does your HR team spend handling complaints through informal channels (email, in-person)?", de: "How much time per month does your HR team spend handling complaints through informal channels (email, in-person)?" },
    ],
    manager: [
      { en: "How much time per month do your managers spend dealing with team conflict or compliance concerns?", es: "¿Cuánto tiempo al mes dedican vuestros managers a gestionar conflictos de equipo o temas de cumplimiento?", fr: "Combien de temps par mois vos managers passent-ils à gérer des conflits d'équipe ou des problèmes de conformité ?", it: "How much time per month do your managers spend dealing with team conflict or compliance concerns?", de: "How much time per month do your managers spend dealing with team conflict or compliance concerns?" },
    ],
  },
  lms: {
    employee: [{ en: "How much time per month do your employees spend searching for and accessing training content?", es: "¿Cuánto tiempo al mes dedican vuestros empleados a buscar y acceder a contenido formativo?", fr: "Combien de temps par mois vos employés passent-ils à chercher et accéder au contenu de formation ?", it: "Quanto tempo al mese i dipendenti dedicano alla ricerca e all'accesso ai contenuti formativi?", de: "Wie viel Zeit pro Monat verbringen Ihre Mitarbeiter damit, Schulungsinhalte zu suchen und darauf zuzugreifen?" , pt: "Quanto tempo por mês dedicam os colaboradores a procurar e aceder a conteúdo formativo?"}],
    hr: [{ en: "How many hours per month does your HR team spend creating and managing training content and tracking completions?", es: "¿Cuántas horas al mes dedica vuestro equipo de RRHH a crear contenido formativo y hacer seguimiento de completados?", fr: "Combien d'heures par mois votre équipe RH consacre-t-elle à créer du contenu de formation et suivre les complétions ?", it: "Quante ore al mese il team HR dedica alla creazione di contenuti formativi e al monitoraggio dei completamenti?", de: "Wie viele Stunden pro Monat verbringt Ihr HR-Team mit Erstellung von Schulungsinhalten und Verfolgung von Abschlüssen?" , pt: "Quantas horas por mês dedica a equipa de RH a criar conteúdo formativo e acompanhar conclusões?"}],
  },
  benefits_standard: {
    hr: [{ en: "How many hours per month does your HR team spend administrating employee benefits (enrollment, changes, queries)?", es: "¿Cuántas horas al mes dedica vuestro equipo de RRHH a administrar los beneficios de empleados (altas, cambios, consultas)?", fr: "Combien d'heures par mois votre équipe RH consacre-t-elle à administrer les avantages sociaux (inscriptions, modifications, demandes) ?", it: "Quante ore al mese il team HR dedica all'amministrazione dei benefit (iscrizioni, modifiche, richieste)?", de: "Wie viele Stunden pro Monat verbringt Ihr HR-Team mit der Verwaltung von Mitarbeiterleistungen (Anmeldungen, Änderungen, Anfragen)?" , pt: "Quantas horas por mês dedica a equipa de RH a administrar benefícios (inscrições, alterações, consultas)?"}],
    employee: [{ en: "How much time per month do your employees spend understanding and managing their benefits?", es: "¿Cuánto tiempo al mes dedican vuestros empleados a entender y gestionar sus beneficios?", fr: "Combien de temps par mois vos employés passent-ils à comprendre et gérer leurs avantages ?", it: "Quanto tempo al mese i dipendenti dedicano alla comprensione e gestione dei propri benefit?", de: "Wie viel Zeit pro Monat verbringen Ihre Mitarbeiter damit, ihre Leistungen zu verstehen und zu verwalten?" , pt: "Quanto tempo por mês dedicam os colaboradores a perceber e gerir os seus benefícios?"}],
  },
  benefits: {
    hr: [{ en: "How many hours per month does your HR team spend managing salary advance requests and reconciliation?", es: "¿Cuántas horas al mes dedica vuestro equipo de RRHH a gestionar solicitudes de anticipo y su conciliación?", fr: "Combien d'heures par mois votre équipe RH consacre-t-elle à gérer les demandes d'avance sur salaire et leur réconciliation ?", it: "Quante ore al mese il team HR dedica alla gestione delle richieste di anticipo stipendio e alla loro riconciliazione?", de: "Wie viele Stunden pro Monat verbringt Ihr HR-Team mit Gehaltsvorschussanfragen und deren Abstimmung?" , pt: "Quantas horas por mês dedica a equipa de RH a gerir pedidos de adiantamento salarial e conciliação?"}],
    employee: [{ en: "Have your employees ever faced financial stress between paydays that impacted their focus at work?", es: "¿Alguna vez vuestros empleados han tenido estrés financiero entre nóminas que ha afectado a su concentración en el trabajo?", fr: "Vos employés ont-ils déjà subi un stress financier entre deux salaires qui a affecté leur concentration au travail ?", it: "I vostri dipendenti hanno mai vissuto stress finanziario tra uno stipendio e l'altro che ha influito sulla loro concentrazione?", de: "Haben Ihre Mitarbeiter jemals finanziellen Stress zwischen den Gehaltsterminen erlebt, der ihre Arbeitskonzentration beeinträchtigte?" , pt: "Os colaboradores já experienciaram stress financeiro entre pagamentos que afetou a sua concentração no trabalho?"}],
  },
};
