
ALTER TABLE public.pain_library ADD COLUMN IF NOT EXISTS pain_statement_es TEXT;
ALTER TABLE public.pain_library ADD COLUMN IF NOT EXISTS pain_statement_fr TEXT;

UPDATE public.pain_library SET pain_statement_es = 'Sin visibilidad en tiempo real del headcount, estructura organizativa o datos básicos de empleados; los datos están dispersos en hojas de cálculo y emails.' WHERE pain_id = 'P01';
UPDATE public.pain_library SET pain_statement_es = 'Las reglas de acumulación de vacaciones y los festivos específicos por país se gestionan manualmente, creando riesgos de cumplimiento y disputas.' WHERE pain_id = 'P02';
UPDATE public.pain_library SET pain_statement_es = 'La rotación de talento es alta; no podemos identificar empleados desmotivados antes de que se vayan; los costes de reemplazo erosionan el margen silenciosamente.' WHERE pain_id = 'P03';
UPDATE public.pain_library SET pain_statement_es = 'El onboarding de nuevos empleados tarda demasiado, el papeleo está por todas partes, el tiempo hasta la productividad es lento.' WHERE pain_id = 'P04';
UPDATE public.pain_library SET pain_statement_es = 'El control horario es manual/papel o Excel; luchamos con el cumplimiento de la legislación laboral de la UE (ES Real Decreto / FR reporte semanal); el riesgo de auditoría es real.' WHERE pain_id = 'P05';
UPDATE public.pain_library SET pain_statement_es = 'La planificación de turnos se hace en hojas de cálculo; el exceso y la falta de personal causan desperdicio en nómina y problemas de experiencia del cliente.' WHERE pain_id = 'P06';
UPDATE public.pain_library SET pain_statement_es = 'No podemos cubrir vacantes lo suficientemente rápido; las comisiones de agencias devoran el presupuesto; el time-to-hire es demasiado largo.' WHERE pain_id = 'P07';
UPDATE public.pain_library SET pain_statement_es = 'El cumplimiento de formación y L&D está fragmentado; no podemos demostrar la entrega de formación para FUNDAE/auditorías o certificaciones ISO/calidad.' WHERE pain_id = 'P08';
UPDATE public.pain_library SET pain_statement_es = 'Los informes de gastos tardan días en cerrarse cada mes; se pierden recibos; la conciliación es dolorosa.' WHERE pain_id = 'P09';
UPDATE public.pain_library SET pain_statement_es = 'Las compras y el gasto con proveedores no están controlados; el gasto no autorizado es alto; no podemos imponer aprobaciones.' WHERE pain_id = 'P10';
UPDATE public.pain_library SET pain_statement_es = 'Las nóminas requieren conciliación manual; la tasa de error es inaceptable; finanzas y RRHH reintroducen los mismos datos.' WHERE pain_id = 'P11';
UPDATE public.pain_library SET pain_statement_es = 'No sabemos qué software tiene cada empleado; el desperdicio de licencias es alto; el offboarding es un riesgo de seguridad por cuentas huérfanas.' WHERE pain_id = 'P12';

UPDATE public.pain_library SET pain_statement_fr = 'Aucune visibilité en temps réel sur les effectifs, la structure organisationnelle ou les données de base des employés ; les données sont dispersées dans des tableurs et des emails.' WHERE pain_id = 'P01';
UPDATE public.pain_library SET pain_statement_fr = 'Les règles d''accumulation de congés et les jours fériés spécifiques par pays sont gérés manuellement, créant des risques de conformité et de litiges.' WHERE pain_id = 'P02';
UPDATE public.pain_library SET pain_statement_fr = 'L''attrition des talents est élevée ; nous ne pouvons pas identifier les employés désengagés avant leur départ ; les coûts de remplacement érodent silencieusement la marge.' WHERE pain_id = 'P03';
UPDATE public.pain_library SET pain_statement_fr = 'L''intégration des nouveaux employés prend trop de temps, la paperasse est partout, le délai de productivité est lent.' WHERE pain_id = 'P04';
UPDATE public.pain_library SET pain_statement_fr = 'Le suivi du temps est manuel/papier ou Excel ; nous avons du mal avec la conformité au droit du travail européen (ES Real Decreto / FR reporting hebdomadaire) ; le risque d''audit est réel.' WHERE pain_id = 'P05';
UPDATE public.pain_library SET pain_statement_fr = 'La planification des postes/horaires se fait sur tableur ; le sur- et sous-effectif entraîne du gaspillage de paie et des problèmes d''expérience client.' WHERE pain_id = 'P06';
UPDATE public.pain_library SET pain_statement_fr = 'Nous ne pouvons pas pourvoir les postes assez vite ; les frais d''agence dévorent le budget ; le délai de recrutement est trop long.' WHERE pain_id = 'P07';
UPDATE public.pain_library SET pain_statement_fr = 'La conformité formation et L&D est fragmentée ; nous ne pouvons pas prouver la réalisation des formations pour les audits ou les certifications ISO/qualité.' WHERE pain_id = 'P08';
UPDATE public.pain_library SET pain_statement_fr = 'Les notes de frais prennent des jours à clôturer chaque mois ; les reçus se perdent ; le rapprochement est pénible.' WHERE pain_id = 'P09';
UPDATE public.pain_library SET pain_statement_fr = 'Les achats et dépenses fournisseurs ne sont pas contrôlés ; les dépenses non autorisées sont élevées ; nous ne pouvons pas imposer les approbations.' WHERE pain_id = 'P10';
UPDATE public.pain_library SET pain_statement_fr = 'La paie nécessite un rapprochement manuel ; le taux d''erreur est inacceptable ; la finance et les RH ressaisissent les mêmes données.' WHERE pain_id = 'P11';
UPDATE public.pain_library SET pain_statement_fr = 'Nous ne savons pas quels logiciels chaque employé utilise ; le gaspillage de licences est élevé ; le départ est un risque de sécurité à cause des comptes orphelins.' WHERE pain_id = 'P12';
