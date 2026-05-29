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
}

export const MODULE_INFO: Record<string, ModuleInfo> = {
  core: {
    label: { en: "Employee Platform / Core", es: "Plataforma del Empleado / Core", fr: "Plateforme Employé / Core" },
    description: { en: "Central hub for employee data, documents, and self-service", es: "Hub central de datos de empleados, documentos y autoservicio", fr: "Hub central des données employés, documents et libre-service" },
  },
  time_off: {
    label: { en: "Time Off", es: "Ausencias", fr: "Congés" },
    description: { en: "Leave requests, balances, and approval workflows", es: "Solicitudes de ausencia, saldos y flujos de aprobación", fr: "Demandes de congés, soldes et workflows d'approbation" },
  },
  time_tracking: {
    label: { en: "Time Tracking", es: "Control Horario", fr: "Suivi du Temps" },
    description: { en: "Clock-in/out, timesheets, and overtime management", es: "Fichaje, hojas de horas y gestión de horas extra", fr: "Pointage, feuilles de temps et gestion des heures sup" },
  },
  time_planning: {
    label: { en: "Shift Management", es: "Gestión de Turnos", fr: "Gestion des Plannings" },
    description: { en: "Shift planning, rotations, and team scheduling", es: "Planificación de turnos, rotaciones y horarios de equipo", fr: "Planification des rotations, des équipes et des plannings" },
  },
  payroll: {
    label: { en: "Payroll Connect", es: "Nóminas", fr: "Paie" },
    description: { en: "Payroll data sync and variable pay management", es: "Sincronización de datos de nómina y gestión de variables", fr: "Synchronisation des données de paie et gestion des variables" },
  },
  recruitment: {
    label: { en: "Recruitment", es: "Selección", fr: "Recrutement" },
    description: { en: "Job postings, candidate pipeline, and hiring workflows", es: "Ofertas, pipeline de candidatos y flujos de contratación", fr: "Offres d'emploi, pipeline de candidats et workflows d'embauche" },
  },
  performance: {
    label: { en: "Performance", es: "Desempeño", fr: "Performance" },
    description: { en: "Reviews, goals, and continuous feedback", es: "Evaluaciones, objetivos y feedback continuo", fr: "Évaluations, objectifs et feedback continu" },
  },
  expenses: {
    label: { en: "Expenses", es: "Gastos", fr: "Notes de Frais" },
    description: { en: "Expense submission, approval, and reimbursement", es: "Presentación, aprobación y reembolso de gastos", fr: "Soumission, approbation et remboursement des frais" },
  },
  trainings: {
    label: { en: "Training", es: "Formación", fr: "Formation" },
    description: { en: "Training plans, compliance tracking, and certifications", es: "Planes de formación, seguimiento de cumplimiento y certificaciones", fr: "Plans de formation, suivi de conformité et certifications" },
  },
  compensations: {
    label: { en: "Compensation", es: "Compensación", fr: "Rémunération" },
    description: { en: "Salary reviews, benchmarking, and budget control", es: "Revisiones salariales, benchmarking y control presupuestario", fr: "Revues salariales, benchmarking et contrôle budgétaire" },
  },
  engagement: {
    label: { en: "Engagement", es: "Engagement", fr: "Engagement" },
    description: { en: "Pulse surveys, eNPS, and team satisfaction", es: "Encuestas pulse, eNPS y satisfacción del equipo", fr: "Enquêtes pulse, eNPS et satisfaction des équipes" },
  },
  documents: {
    label: { en: "Documents", es: "Documentos", fr: "Documents" },
    description: { en: "Document generation, e-signature, and digital vault", es: "Generación de documentos, firma electrónica y archivo digital", fr: "Génération de documents, signature électronique et coffre-fort numérique" },
  },
  procurement: {
    label: { en: "Procurement", es: "Compras", fr: "Achats" },
    description: { en: "Purchase requests, approvals, and vendor management", es: "Solicitudes de compra, aprobaciones y gestión de proveedores", fr: "Demandes d'achat, approbations et gestion des fournisseurs" },
  },
  projects: {
    label: { en: "Projects", es: "Proyectos", fr: "Projets" },
    description: { en: "Project time tracking and team allocation", es: "Control de tiempo por proyecto y asignación de equipo", fr: "Suivi du temps par projet et allocation d'équipe" },
  },
  headcount_planning: {
    label: { en: "Headcount Planning", es: "Planificación de Plantilla", fr: "Planification des Effectifs" },
    description: { en: "Workforce planning and position management", es: "Planificación de plantilla y gestión de posiciones", fr: "Planification des effectifs et gestion des postes" },
  },
  lms: {
    label: { en: "LMS", es: "LMS", fr: "LMS" },
    description: { en: "Learning management system with courses and quizzes", es: "Sistema de gestión del aprendizaje con cursos y tests", fr: "Système de gestion de l'apprentissage avec cours et quiz" },
  },
  complaints: {
    label: { en: "Trust Channel", es: "Canal de Denuncias", fr: "Canal de Confiance" },
    description: { en: "Anonymous reporting and whistleblower compliance", es: "Canal de denuncias anónimas y cumplimiento normativo", fr: "Signalement anonyme et conformité lanceur d'alerte" },
  },
  benefits_standard: {
    label: { en: "Benefits", es: "Beneficios", fr: "Avantages" },
    description: { en: "Flexible benefits enrollment and management", es: "Inscripción y gestión de beneficios flexibles", fr: "Inscription et gestion des avantages sociaux" },
  },
  benefits: {
    label: { en: "Salary Advance", es: "Anticipo de Nómina", fr: "Avance sur Salaire" },
    description: { en: "On-demand salary advance for employees", es: "Anticipo de nómina a demanda para empleados", fr: "Avance sur salaire à la demande pour les employés" },
  },
  wellhub: {
    label: { en: "Wellhub", es: "Wellhub", fr: "Wellhub" },
    description: { en: "Integrated wellness programs for employees", es: "Programas de bienestar integrados para empleados", fr: "Programmes de bien-être intégrés pour les employés" },
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
};
