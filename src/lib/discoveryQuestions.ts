export type Stakeholder = "employee" | "hr" | "manager";

export interface LocalizedText {
  en: string;
  es: string;
  fr: string;
}

export type DiscoveryQuestion = LocalizedText;

export function getLocalized(t: LocalizedText, lang: string): string {
  if (lang.startsWith("es")) return t.es;
  if (lang.startsWith("fr")) return t.fr;
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
    label: { en: "Employee Platform / Core", es: "Plataforma del Empleado / Core", fr: "Plateforme Employé / Core" },
    description: { en: "Centralize all employee data and empower your team with self-service", es: "Centraliza todos los datos de empleados y empodera a tu equipo con autoservicio", fr: "Centralisez toutes les données employés et donnez l'autonomie à votre équipe" },
    color: "#6B7280",
    image: "/modules/core.png",
    valueProps: [
      { en: "Single source of truth for all employee data", es: "Fuente única de verdad para todos los datos de empleados", fr: "Source unique de vérité pour toutes les données employés" },
      { en: "Reduce HR admin with employee self-service", es: "Reduce el trabajo administrativo de RRHH con autoservicio", fr: "Réduisez l'admin RH grâce au libre-service employé" },
      { en: "Automatic notifications and approval workflows", es: "Notificaciones automáticas y flujos de aprobación", fr: "Notifications automatiques et workflows d'approbation" },
    ],
  },
  time_off: {
    label: { en: "Time Off", es: "Ausencias", fr: "Congés" },
    description: { en: "Automate leave management so your team can focus on what matters", es: "Automatiza la gestión de ausencias para que tu equipo se centre en lo importante", fr: "Automatisez la gestion des congés pour que votre équipe se concentre sur l'essentiel" },
    color: "#6B7280",
    image: "/modules/time_off.png",
    valueProps: [
      { en: "Employees request and track leave from their phone", es: "Los empleados solicitan y consultan ausencias desde el móvil", fr: "Les employés demandent et suivent leurs congés depuis leur téléphone" },
      { en: "Automatic balance calculations and carryover rules", es: "Cálculo automático de saldos y reglas de arrastre", fr: "Calcul automatique des soldes et règles de report" },
      { en: "Managers approve with one tap, no email chains", es: "Los managers aprueban con un clic, sin cadenas de email", fr: "Les managers approuvent en un clic, sans chaînes d'emails" },
    ],
  },
  time_tracking: {
    label: { en: "Time Tracking", es: "Control Horario", fr: "Suivi du Temps" },
    description: { en: "Ensure labor law compliance with effortless clock-in and timesheets", es: "Cumple con la normativa laboral con fichaje y hojas de horas sin esfuerzo", fr: "Assurez la conformité légale avec un pointage et des feuilles de temps sans effort" },
    color: "#6B7280",
    image: "/modules/time_tracking.png",
    valueProps: [
      { en: "One-click clock in from any device", es: "Fichaje con un clic desde cualquier dispositivo", fr: "Pointage en un clic depuis n'importe quel appareil" },
      { en: "Automatic overtime calculation and alerts", es: "Cálculo automático de horas extra y alertas", fr: "Calcul automatique des heures sup et alertes" },
      { en: "Direct sync with payroll for zero errors", es: "Sincronización directa con nóminas sin errores", fr: "Synchronisation directe avec la paie sans erreurs" },
    ],
  },
  time_planning: {
    label: { en: "Shift Management", es: "Gestión de Turnos", fr: "Gestion des Plannings" },
    description: { en: "Plan shifts and rotations visually, keeping your team aligned", es: "Planifica turnos y rotaciones de forma visual, manteniendo a tu equipo alineado", fr: "Planifiez les rotations visuellement, en gardant votre équipe alignée" },
    color: "#2563EB",
    image: "/modules/time_planning.png",
    valueProps: [
      { en: "Drag-and-drop shift planning", es: "Planificación de turnos con arrastrar y soltar", fr: "Planification des plannings par glisser-déposer" },
      { en: "Automatic conflict detection and coverage alerts", es: "Detección automática de conflictos y alertas de cobertura", fr: "Détection automatique des conflits et alertes de couverture" },
    ],
  },
  payroll: {
    label: { en: "Payroll Connect", es: "Nóminas", fr: "Paie" },
    description: { en: "Sync HR data to payroll automatically — no more manual re-entry", es: "Sincroniza los datos de RRHH con nóminas automáticamente — sin re-introducción manual", fr: "Synchronisez les données RH avec la paie automatiquement — plus de saisie manuelle" },
    color: "#FB923C",
    image: "/modules/payroll.png",
    valueProps: [
      { en: "One-click payroll data sync", es: "Sincronización de datos de nómina con un clic", fr: "Synchronisation des données de paie en un clic" },
      { en: "Track and manage variable pay components", es: "Controla y gestiona los componentes variables de nómina", fr: "Suivez et gérez les composantes variables de la paie" },
    ],
  },
  recruitment: {
    label: { en: "Recruitment", es: "Selección", fr: "Recrutement" },
    description: { en: "Attract and hire top talent with a streamlined pipeline", es: "Atrae y contrata al mejor talento con un pipeline optimizado", fr: "Attirez et recrutez les meilleurs talents avec un pipeline optimisé" },
    color: "#E05C75",
    image: "/modules/recruitment.png",
    valueProps: [
      { en: "Post to multiple job boards in one click", es: "Publica en múltiples portales de empleo con un clic", fr: "Publiez sur plusieurs job boards en un clic" },
      { en: "Collaborative hiring with structured scorecards", es: "Contratación colaborativa con scorecards estructurados", fr: "Recrutement collaboratif avec des grilles d'évaluation" },
    ],
  },
  performance: {
    label: { en: "Performance", es: "Desempeño", fr: "Performance" },
    description: { en: "Drive growth with structured reviews, goals, and continuous feedback", es: "Impulsa el crecimiento con evaluaciones, objetivos y feedback continuo", fr: "Favorisez la croissance avec des évaluations, des objectifs et du feedback continu" },
    color: "#E05C75",
    image: "/modules/performance.png",
    valueProps: [
      { en: "Customizable review cycles and templates", es: "Ciclos de evaluación y plantillas personalizables", fr: "Cycles d'évaluation et modèles personnalisables" },
      { en: "Goal tracking with OKR alignment", es: "Seguimiento de objetivos con alineación OKR", fr: "Suivi des objectifs avec alignement OKR" },
    ],
  },
  expenses: {
    label: { en: "Expenses", es: "Gastos", fr: "Notes de Frais" },
    description: { en: "Simplify expense management from submission to reimbursement", es: "Simplifica la gestión de gastos desde la presentación hasta el reembolso", fr: "Simplifiez la gestion des frais de la soumission au remboursement" },
    color: "#14B8A6",
    image: "/modules/expenses.png",
    valueProps: [
      { en: "Snap a receipt and submit in seconds", es: "Foto del ticket y envío en segundos", fr: "Photographiez le reçu et soumettez en quelques secondes" },
      { en: "Automatic policy validation and approval flows", es: "Validación automática de política y flujos de aprobación", fr: "Validation automatique de la politique et workflows d'approbation" },
    ],
  },
  trainings: {
    label: { en: "Training", es: "Formación", fr: "Formation" },
    description: { en: "Keep your team skilled and compliant with structured training plans", es: "Mantén a tu equipo formado y en cumplimiento con planes de formación estructurados", fr: "Gardez votre équipe formée et conforme avec des plans de formation structurés" },
    color: "#E05C75",
    image: "/modules/trainings.png",
    valueProps: [
      { en: "Track mandatory training completion automatically", es: "Seguimiento automático de formación obligatoria", fr: "Suivi automatique des formations obligatoires" },
      { en: "Centralized training catalog with enrollment", es: "Catálogo de formación centralizado con inscripción", fr: "Catalogue de formation centralisé avec inscription" },
    ],
  },
  compensations: {
    label: { en: "Compensation", es: "Compensación", fr: "Rémunération" },
    description: { en: "Run salary reviews with data, fairness, and budget control", es: "Gestiona revisiones salariales con datos, equidad y control presupuestario", fr: "Menez les revues salariales avec données, équité et contrôle budgétaire" },
    color: "#FB923C",
    image: "/modules/compensations.png",
    valueProps: [
      { en: "Salary benchmarking against market data", es: "Benchmarking salarial con datos de mercado", fr: "Benchmarking salarial avec des données de marché" },
      { en: "Budget control with real-time impact simulation", es: "Control presupuestario con simulación de impacto en tiempo real", fr: "Contrôle budgétaire avec simulation d'impact en temps réel" },
    ],
  },
  engagement: {
    label: { en: "Engagement", es: "Engagement", fr: "Engagement" },
    description: { en: "Measure and improve team satisfaction with pulse surveys and eNPS", es: "Mide y mejora la satisfacción de tu equipo con encuestas pulse y eNPS", fr: "Mesurez et améliorez la satisfaction de votre équipe avec des enquêtes pulse et eNPS" },
    color: "#E05C75",
    image: "/modules/engagement.png",
    valueProps: [
      { en: "Automated pulse surveys with trend analysis", es: "Encuestas pulse automáticas con análisis de tendencias", fr: "Enquêtes pulse automatisées avec analyse des tendances" },
      { en: "Anonymous feedback that drives real action", es: "Feedback anónimo que impulsa acciones reales", fr: "Feedback anonyme qui génère de vraies actions" },
    ],
  },
  documents: {
    label: { en: "Documents", es: "Documentos", fr: "Documents" },
    description: { en: "Generate, sign, and store documents digitally — no more paper", es: "Genera, firma y almacena documentos digitalmente — sin más papel", fr: "Générez, signez et stockez les documents numériquement — plus de papier" },
    color: "#6B7280",
    valueProps: [
      { en: "Auto-generate contracts and certificates from templates", es: "Genera automáticamente contratos y certificados desde plantillas", fr: "Générez automatiquement contrats et attestations depuis des modèles" },
      { en: "Legally-binding e-signature built in", es: "Firma electrónica con validez legal integrada", fr: "Signature électronique à valeur légale intégrée" },
      { en: "Centralize all employee documents with controlled access", es: "Centraliza todos los documentos de empleados con acceso controlado", fr: "Centralisez tous les documents employés avec accès contrôlé" },
    ],
  },
  procurement: {
    label: { en: "Procurement", es: "Compras", fr: "Achats" },
    description: { en: "Streamline purchase requests with approvals and budget tracking", es: "Optimiza las solicitudes de compra con aprobaciones y control presupuestario", fr: "Rationalisez les demandes d'achat avec approbations et suivi budgétaire" },
    color: "#14B8A6",
    image: "/modules/procurement.png",
    valueProps: [
      { en: "Streamline purchase approvals with multi-level workflows", es: "Agiliza las aprobaciones de compra con flujos multinivel", fr: "Simplifiez les approbations d'achat avec des workflows multi-niveaux" },
      { en: "Control budgets in real time and avoid unauthorized spending", es: "Controla los presupuestos en tiempo real y evita gastos no autorizados", fr: "Contrôlez les budgets en temps réel et évitez les dépenses non autorisées" },
      { en: "Centralize all purchase requests and track their status in one place", es: "Centraliza todas las solicitudes de compra y controla su estado desde un único lugar", fr: "Centralisez toutes les demandes d'achat et suivez leur statut en un seul endroit" },
    ],
  },
  projects: {
    label: { en: "Projects", es: "Proyectos", fr: "Projets" },
    description: { en: "Track time by project and optimize team allocation", es: "Controla el tiempo por proyecto y optimiza la asignación del equipo", fr: "Suivez le temps par projet et optimisez l'allocation de l'équipe" },
    color: "#14B8A6",
    image: "/modules/projects.png",
    valueProps: [
      { en: "Track time and costs per project with full precision", es: "Controla el tiempo y los costes por proyecto con total precisión", fr: "Suivez le temps et les coûts par projet avec une précision totale" },
      { en: "Analyze labor costs, fixed costs and expenses in real time", es: "Analiza costes laborales, costes fijos y gastos en tiempo real", fr: "Analysez les coûts de main-d'œuvre, les coûts fixes et les dépenses en temps réel" },
      { en: "Optimize team allocation and detect budget overruns early", es: "Optimiza la asignación del equipo y detecta desviaciones de presupuesto a tiempo", fr: "Optimisez l'allocation des équipes et détectez les dépassements budgétaires à temps" },
    ],
  },
  headcount_planning: {
    label: { en: "Headcount Planning", es: "Planificación de Plantilla", fr: "Planification des Effectifs" },
    description: { en: "Plan your workforce strategically with position management", es: "Planifica tu plantilla de forma estratégica con gestión de posiciones", fr: "Planifiez vos effectifs stratégiquement avec la gestion des postes" },
    color: "#8B5CF6",
    valueProps: [
      { en: "Plan your org structure with open positions and hiring forecasts", es: "Planifica tu estructura organizativa con posiciones abiertas y previsiones de contratación", fr: "Planifiez votre structure organisationnelle avec postes ouverts et prévisions de recrutement" },
      { en: "Align headcount with budget and business goals", es: "Alinea la plantilla con el presupuesto y los objetivos del negocio", fr: "Alignez les effectifs avec le budget et les objectifs de l'entreprise" },
      { en: "Get a clear view of current and future workforce composition", es: "Obtén una visión clara de la composición actual y futura de tu plantilla", fr: "Obtenez une vision claire de la composition actuelle et future de vos effectifs" },
    ],
  },
  lms: {
    label: { en: "LMS", es: "LMS", fr: "LMS" },
    description: { en: "Create and deliver training content with built-in tracking", es: "Crea y distribuye contenido formativo con seguimiento integrado", fr: "Créez et distribuez du contenu de formation avec suivi intégré" },
    color: "#E05C75",
    valueProps: [
      { en: "Create, assign and track training content from one platform", es: "Crea, asigna y controla contenido formativo desde una sola plataforma", fr: "Créez, assignez et suivez le contenu de formation depuis une seule plateforme" },
      { en: "Automate course enrollment based on role, team or onboarding", es: "Automatiza la inscripción a cursos por rol, equipo o proceso de onboarding", fr: "Automatisez les inscriptions aux formations par rôle, équipe ou onboarding" },
      { en: "Monitor completion rates and track employee skill development", es: "Controla las tasas de finalización y el desarrollo de competencias de tu equipo", fr: "Suivez les taux de complétion et le développement des compétences de vos équipes" },
    ],
  },
  complaints: {
    label: { en: "Trust Channel", es: "Canal de Denuncias", fr: "Canal de Confiance" },
    description: { en: "Comply with regulations and offer an internal space to report irregularities", es: "Cumple con la normativa y ofrece un espacio interno para reportar irregularidades", fr: "Conformez-vous à la réglementation et offrez un espace interne pour signaler les irrégularités" },
    image: "/modules/complaints.png",
    color: "#EF4444",
    valueProps: [
      { en: "Avoid sanctions and protect your company's reputation", es: "Evita sanciones y mantén la reputación e imagen de tu empresa", fr: "Évitez les sanctions et protégez la réputation de votre entreprise" },
      { en: "Integrate an anonymous and secure channel that complies with GDPR", es: "Integra un canal de denuncias anónimo y seguro que cumple con la GDPR", fr: "Intégrez un canal de signalement anonyme et sécurisé conforme au RGPD" },
      { en: "Provide a good experience for your team and avoid workplace climate issues", es: "Proporciona una buena experiencia a tu equipo y evita problemas de clima laboral", fr: "Offrez une bonne expérience à votre équipe et évitez les problèmes de climat social" },
    ],
  },
  benefits_standard: {
    label: { en: "Benefits", es: "Beneficios", fr: "Avantages" },
    description: { en: "Improve your team's experience with flexible benefits", es: "Mejora la experiencia de tu equipo con la retribución flexible", fr: "Améliorez l'expérience de votre équipe avec les avantages flexibles" },
    color: "#F59E0B",
    image: "/modules/benefits_standard.png",
    valueProps: [
      { en: "Offer a modern benefits package to attract and retain talent without increasing salary costs", es: "Ofrece un paquete de beneficios moderno y competitivo para atraer y retener talento sin aumentar costes salariales", fr: "Offrez un package d'avantages modernes pour attirer et retenir les talents sans augmenter les coûts salariaux" },
      { en: "Increase team satisfaction by letting employees spend on what they truly value", es: "Aumenta la satisfacción del equipo permitiendo a los empleados gastar en lo que realmente valoran", fr: "Augmentez la satisfaction de l'équipe en laissant les employés dépenser sur ce qui compte pour eux" },
      { en: "Ensure tax compliance and manage enrollments, cancellations and limits from one place", es: "Garantiza el cumplimiento fiscal y gestiona altas, bajas y límites de consumo sin fricciones desde un único lugar", fr: "Garantissez la conformité fiscale et gérez les inscriptions, résiliations et limites depuis un seul endroit" },
    ],
  },
  benefits: {
    label: { en: "Salary Advance", es: "Anticipo de Nómina", fr: "Avance sur Salaire" },
    description: { en: "Give employees on-demand access to their earned salary", es: "Da a tus empleados acceso inmediato a su salario ya devengado", fr: "Donnez à vos employés un accès instantané à leur salaire déjà gagné" },
    color: "#F59E0B",
    valueProps: [
      { en: "Reduce financial stress without any impact on company cash flow", es: "Reduce el estrés financiero de tus empleados sin impactar la tesorería de la empresa", fr: "Réduisez le stress financier sans impact sur la trésorerie de l'entreprise" },
      { en: "100% digital, instant and fully integrated with payroll", es: "100% digital, inmediato y totalmente integrado con nómina", fr: "100% digital, instantané et entièrement intégré à la paie" },
      { en: "Improve employee retention and satisfaction as a key benefit", es: "Mejora la retención y satisfacción del empleado como beneficio diferencial", fr: "Améliorez la rétention et la satisfaction des employés comme avantage clé" },
    ],
  },
  wellhub: {
    label: { en: "Wellhub", es: "Wellhub", fr: "Wellhub" },
    description: { en: "Give your team access to gyms, studios and wellness apps", es: "Da a tu equipo acceso a gimnasios, estudios y apps de bienestar", fr: "Donnez à votre équipe l'accès à des salles de sport, studios et applications bien-être" },
    color: "#10B981",
    valueProps: [
      { en: "Access to 50,000+ gyms, studios and wellness apps worldwide", es: "Acceso a más de 50.000 gimnasios, estudios y apps de bienestar en todo el mundo", fr: "Accès à plus de 50 000 salles de sport, studios et applications bien-être dans le monde" },
      { en: "Improve team wellbeing and reduce absenteeism", es: "Mejora el bienestar del equipo y reduce el absentismo", fr: "Améliorez le bien-être de l'équipe et réduisez l'absentéisme" },
      { en: "Flexible plans that adapt to each employee's lifestyle", es: "Planes flexibles que se adaptan al estilo de vida de cada empleado", fr: "Plans flexibles adaptés au mode de vie de chaque employé" },
    ],
  },
};

export const DISCOVERY_QUESTIONS: Record<
  string,
  Partial<Record<Stakeholder, DiscoveryQuestion[]>>
> = {
  core: {
    employee: [{ en: "How many minutes per month do you spend on HR admin (updating personal data, requesting documents, checking policies)?", es: "¿Cuántos minutos al mes dedicáis a gestiones de RRHH (actualizar datos, pedir documentos, consultar políticas)?", fr: "Combien de minutes par mois passez-vous sur l'admin RH (mise à jour de données, demandes de documents, consultation des politiques) ?" }],
    hr: [{ en: "How many hours per month does your team spend maintaining employee records and answering routine requests?", es: "¿Cuántas horas al mes dedica vuestro equipo a mantener fichas de empleados y responder consultas rutinarias?", fr: "Combien d'heures par mois votre équipe consacre-t-elle à la tenue des dossiers employés et aux demandes courantes ?" }],
    manager: [{ en: "How much time per month do you lose looking for team info (contracts, org chart, headcount)?", es: "¿Cuánto tiempo al mes perdéis buscando info de vuestro equipo (contratos, organigrama, plantilla)?", fr: "Combien de temps par mois perdez-vous à chercher les infos de votre équipe (contrats, organigramme, effectifs) ?" }],
  },
  time_off: {
    employee: [{ en: "How many minutes does it take you to request a day off and check your balance?", es: "¿Cuántos minutos tardáis en solicitar un día libre y consultar vuestro saldo?", fr: "Combien de minutes vous faut-il pour poser un congé et consulter votre solde ?" }],
    hr: [{ en: "How many hours per month does leave management take (balances, carryover, policy exceptions)?", es: "¿Cuántas horas al mes os lleva la gestión de ausencias (saldos, arrastres, excepciones)?", fr: "Combien d'heures par mois prend la gestion des congés (soldes, reports, exceptions) ?" }],
    manager: [{ en: "How much time per month do you spend reviewing and approving leave requests?", es: "¿Cuánto tiempo al mes dedicáis a revisar y aprobar solicitudes de ausencia?", fr: "Combien de temps par mois passez-vous à examiner et approuver les demandes de congés ?" }],
  },
  time_tracking: {
    employee: [{ en: "How many minutes per day do you spend logging your hours?", es: "¿Cuántos minutos al día dedicáis a registrar vuestras horas?", fr: "Combien de minutes par jour passez-vous à enregistrer vos heures ?" }],
    hr: [{ en: "How many hours per month does timesheet collection and payroll reconciliation take?", es: "¿Cuántas horas al mes os lleva recopilar fichajes y cuadrar con nóminas?", fr: "Combien d'heures par mois prennent la collecte des feuilles de temps et le rapprochement avec la paie ?" }],
    manager: [{ en: "How much time per month do you spend reviewing timesheets and chasing missing entries?", es: "¿Cuánto tiempo al mes dedicáis a revisar fichajes y perseguir los que faltan?", fr: "Combien de temps par mois passez-vous à vérifier les feuilles de temps et relancer les retardataires ?" }],
  },
  time_planning: {
    employee: [{ en: "How many minutes per week do you spend checking your schedule or coordinating swaps?", es: "¿Cuántos minutos a la semana dedicáis a consultar vuestro turno o coordinar cambios?", fr: "Combien de minutes par semaine passez-vous à consulter votre planning ou coordonner des échanges ?" }],
    hr: [{ en: "How many hours per month does shift planning and communication take?", es: "¿Cuántas horas al mes os lleva planificar y comunicar los turnos?", fr: "Combien d'heures par mois prennent la planification et la communication des plannings ?" }],
    manager: [{ en: "How much time per month do you spend building schedules and managing coverage?", es: "¿Cuánto tiempo al mes dedicáis a crear horarios y gestionar coberturas?", fr: "Combien de temps par mois passez-vous à construire les plannings et gérer les remplacements ?" }],
  },
  payroll: {
    hr: [{ en: "How many hours does each payroll run take from data prep to close?", es: "¿Cuántas horas os lleva cada ciclo de nómina desde la preparación hasta el cierre?", fr: "Combien d'heures prend chaque cycle de paie, de la préparation à la clôture ?" }],
    manager: [{ en: "How much time per month do you spend communicating variable pay or payroll changes?", es: "¿Cuánto tiempo al mes dedicáis a comunicar variables de nómina o cambios salariales?", fr: "Combien de temps par mois passez-vous à communiquer les variables de paie ou les changements ?" }],
  },
  recruitment: {
    hr: [{ en: "How many hours per month does managing job postings, screening, and pipeline take?", es: "¿Cuántas horas al mes os lleva gestionar ofertas, cribado y pipeline de candidatos?", fr: "Combien d'heures par mois prennent la gestion des offres, le tri et le suivi du pipeline ?" }],
    manager: [{ en: "How much time per month do you spend on hiring tasks (interviews, feedback, coordination)?", es: "¿Cuánto tiempo al mes dedicáis a tareas de selección (entrevistas, feedback, coordinación)?", fr: "Combien de temps par mois passez-vous sur le recrutement (entretiens, retours, coordination) ?" }],
  },
  performance: {
    employee: [{ en: "How many hours per review cycle do you spend preparing self-evaluations?", es: "¿Cuántas horas por ciclo de evaluación dedicáis a preparar vuestra autoevaluación?", fr: "Combien d'heures par cycle d'évaluation passez-vous à préparer votre auto-évaluation ?" }],
    hr: [{ en: "How many hours per cycle does managing the review process take (setup, reminders, reports)?", es: "¿Cuántas horas por ciclo os lleva gestionar el proceso de evaluación (configuración, recordatorios, informes)?", fr: "Combien d'heures par cycle prend la gestion du processus d'évaluation (configuration, relances, rapports) ?" }],
    manager: [{ en: "How much time per cycle do you spend writing evaluations and giving feedback?", es: "¿Cuánto tiempo por ciclo dedicáis a redactar evaluaciones y dar feedback?", fr: "Combien de temps par cycle passez-vous à rédiger les évaluations et donner du feedback ?" }],
  },
  expenses: {
    employee: [{ en: "How many minutes does it take to submit an expense report?", es: "¿Cuántos minutos tardáis en presentar una nota de gastos?", fr: "Combien de minutes faut-il pour soumettre une note de frais ?" }],
    hr: [{ en: "How many hours per month does expense validation and reconciliation take?", es: "¿Cuántas horas al mes os lleva validar y conciliar los gastos?", fr: "Combien d'heures par mois prennent la validation et le rapprochement des notes de frais ?" }],
    manager: [{ en: "How much time per month do you spend reviewing and approving expense reports?", es: "¿Cuánto tiempo al mes dedicáis a revisar y aprobar notas de gastos?", fr: "Combien de temps par mois passez-vous à examiner et approuver les notes de frais ?" }],
  },
  trainings: {
    employee: [{ en: "How many hours per month do you spend on training admin (finding courses, registering, tracking)?", es: "¿Cuántas horas al mes dedicáis a admin de formación (buscar cursos, inscribiros, seguimiento)?", fr: "Combien d'heures par mois passez-vous sur l'admin formation (recherche, inscription, suivi) ?" }],
    hr: [{ en: "How many hours per month does managing the training plan and compliance tracking take?", es: "¿Cuántas horas al mes os lleva gestionar el plan de formación y el seguimiento de cumplimiento?", fr: "Combien d'heures par mois prennent la gestion du plan de formation et le suivi de conformité ?" }],
    manager: [{ en: "How much time per month do you spend identifying and coordinating training for your team?", es: "¿Cuánto tiempo al mes dedicáis a identificar y coordinar formación para vuestro equipo?", fr: "Combien de temps par mois passez-vous à identifier et coordonner la formation de votre équipe ?" }],
  },
  compensations: {
    hr: [{ en: "How many hours does each salary review cycle take?", es: "¿Cuántas horas os lleva cada ciclo de revisión salarial?", fr: "Combien d'heures prend chaque cycle de revue salariale ?" }],
    manager: [{ en: "How much time per review cycle do you spend on compensation decisions for your team?", es: "¿Cuánto tiempo por ciclo dedicáis a decisiones de compensación de vuestro equipo?", fr: "Combien de temps par cycle passez-vous sur les décisions de rémunération de votre équipe ?" }],
  },
  engagement: {
    hr: [{ en: "How many hours per month does running surveys and analyzing results take?", es: "¿Cuántas horas al mes os lleva lanzar encuestas y analizar resultados?", fr: "Combien d'heures par mois prennent le lancement des enquêtes et l'analyse des résultats ?" }],
    manager: [{ en: "How much time per month do you spend gathering and acting on team feedback?", es: "¿Cuánto tiempo al mes dedicáis a recoger y actuar sobre el feedback de vuestro equipo?", fr: "Combien de temps par mois passez-vous à recueillir le feedback de votre équipe et à agir dessus ?" }],
  },
  documents: {
    employee: [{ en: "How many minutes does it take to get a document from HR (certificate, payslip, contract)?", es: "¿Cuántos minutos tardáis en conseguir un documento de RRHH (certificado, nómina, contrato)?", fr: "Combien de minutes faut-il pour obtenir un document RH (attestation, bulletin, contrat) ?" }],
    hr: [{ en: "How many hours per month does document generation, signing, and filing take?", es: "¿Cuántas horas al mes os lleva generar, firmar y archivar documentos?", fr: "Combien d'heures par mois prennent la génération, la signature et l'archivage des documents ?" }],
  },
  procurement: {
    hr: [{ en: "How many hours per month does processing purchase requests take?", es: "¿Cuántas horas al mes os lleva procesar solicitudes de compra?", fr: "Combien d'heures par mois prend le traitement des demandes d'achat ?" }],
    manager: [{ en: "How much time per month do you spend on purchase requests and tracking?", es: "¿Cuánto tiempo al mes dedicáis a solicitudes de compra y seguimiento?", fr: "Combien de temps par mois passez-vous sur les demandes d'achat et leur suivi ?" }],
  },
  projects: {
    employee: [{ en: "How many minutes per day do you spend logging time to projects?", es: "¿Cuántos minutos al día dedicáis a imputar tiempo a proyectos?", fr: "Combien de minutes par jour passez-vous à saisir du temps sur les projets ?" }],
    manager: [{ en: "How much time per month do you spend tracking project hours and team allocation?", es: "¿Cuánto tiempo al mes dedicáis a controlar horas de proyecto y asignación del equipo?", fr: "Combien de temps par mois passez-vous à suivre les heures projet et l'allocation de l'équipe ?" }],
  },
  headcount_planning: {
    hr: [{ en: "How many hours per month does headcount planning and position tracking take?", es: "¿Cuántas horas al mes os lleva la planificación de plantilla y seguimiento de posiciones?", fr: "Combien d'heures par mois prennent la planification des effectifs et le suivi des postes ?" }],
    manager: [{ en: "How much time per quarter do you spend forecasting hiring needs?", es: "¿Cuánto tiempo por trimestre dedicáis a prever necesidades de contratación?", fr: "Combien de temps par trimestre passez-vous à prévoir vos besoins en recrutement ?" }],
  },
  integration_business_central: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Business Central?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Business Central?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Business Central ?" }],
  },
  integration_netsuite: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and NetSuite?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y NetSuite?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et NetSuite ?" }],
  },
  integration_sage_200: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Sage 200?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Sage 200?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Sage 200 ?" }],
  },
  integration_sap: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and SAP?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y SAP?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et SAP ?" }],
  },
  integration_datev: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and DATEV?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y DATEV?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et DATEV ?" }],
  },
  integration_a3: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and A3?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y A3?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et A3 ?" }],
  },
  integration_xero: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Xero?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Xero?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Xero ?" }],
  },
  integration_quickbooks: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and QuickBooks?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y QuickBooks?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et QuickBooks ?" }],
  },
  integration_milena: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Milena?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Milena?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Milena ?" }],
  },
  integration_suprema_xiptic: {
    hr: [{ en: "How many hours per month do you spend syncing data with your access control system?", es: "¿Cuántas horas al mes dedicáis a sincronizar datos con vuestro sistema de control de acceso?", fr: "Combien d'heures par mois passez-vous à synchroniser les données avec votre système de contrôle d'accès ?" }],
  },
  silae: {
    hr: [{ en: "How many hours per month do you spend on manual data entry between HR and Silae?", es: "¿Cuántas horas al mes dedicáis a introducir datos manualmente entre RRHH y Silae?", fr: "Combien d'heures par mois passez-vous à saisir manuellement des données entre les RH et Silae ?" }],
  },
  complaints: {
    hr: [
      { en: "How much time per month does your HR team spend handling complaints through informal channels (email, in-person)?", es: "¿Cuánto tiempo al mes dedica vuestro equipo de RRHH a gestionar quejas o denuncias por canales informales (email, en persona)?", fr: "Combien de temps par mois votre équipe RH consacre-t-elle à traiter les plaintes par des canaux informels (email, en personne) ?" },
    ],
    manager: [
      { en: "How much time per month do your managers spend dealing with team conflict or compliance concerns?", es: "¿Cuánto tiempo al mes dedican vuestros managers a gestionar conflictos de equipo o temas de cumplimiento?", fr: "Combien de temps par mois vos managers passent-ils à gérer des conflits d'équipe ou des problèmes de conformité ?" },
    ],
  },
  lms: {
    employee: [{ en: "How much time per month do your employees spend searching for and accessing training content?", es: "¿Cuánto tiempo al mes dedican vuestros empleados a buscar y acceder a contenido formativo?", fr: "Combien de temps par mois vos employés passent-ils à chercher et accéder au contenu de formation ?" }],
    hr: [{ en: "How many hours per month does your HR team spend creating and managing training content and tracking completions?", es: "¿Cuántas horas al mes dedica vuestro equipo de RRHH a crear contenido formativo y hacer seguimiento de completados?", fr: "Combien d'heures par mois votre équipe RH consacre-t-elle à créer du contenu de formation et suivre les complétions ?" }],
  },
  benefits_standard: {
    hr: [{ en: "How many hours per month does your HR team spend administrating employee benefits (enrollment, changes, queries)?", es: "¿Cuántas horas al mes dedica vuestro equipo de RRHH a administrar los beneficios de empleados (altas, cambios, consultas)?", fr: "Combien d'heures par mois votre équipe RH consacre-t-elle à administrer les avantages sociaux (inscriptions, modifications, demandes) ?" }],
    employee: [{ en: "How much time per month do your employees spend understanding and managing their benefits?", es: "¿Cuánto tiempo al mes dedican vuestros empleados a entender y gestionar sus beneficios?", fr: "Combien de temps par mois vos employés passent-ils à comprendre et gérer leurs avantages ?" }],
  },
};
