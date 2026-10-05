import { body, param, query } from 'express-validator';

const optionalObjectIdFilters = (fields) =>
   fields.map((field) =>
      query(field)
         .optional()
         .isMongoId()
         .withMessage(`Le filtre ${field} est invalide.`)
   );

export const subjectIdValidator = [
   param('id')
      .isMongoId()
      .withMessage("L'identifiant de la matière est invalide."),
];

export const createSubjectValidator = [
   body('name')
      .trim()
      .notEmpty()
      .withMessage('Le nom de la matière est obligatoire.')
      .isLength({ min: 2, max: 150 })
      .withMessage('Le nom doit contenir entre 2 et 150 caractères.'),
   body('code')
      .trim()
      .notEmpty()
      .withMessage('Le code de la matière est obligatoire.')
      .isLength({ max: 30 })
      .withMessage('Le code ne peut pas dépasser 30 caractères.')
      .toUpperCase(),
   body('description').optional().trim(),
   body('configuration')
      .custom(
         (value) =>
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.keys(value).every((key) =>
               [
                  'academicYear',
                  'program',
                  'level',
                  'module',
                  'coefficient',
                  'calculationRules',
               ].includes(key)
            )
      )
      .withMessage(
         'Les paramètres pédagogiques de la matière sont obligatoires.'
      ),
   body('configuration.academicYear')
      .notEmpty()
      .withMessage("L'année académique est obligatoire.")
      .isMongoId()
      .withMessage("L'identifiant de l'année académique est invalide."),
   body('configuration.program')
      .notEmpty()
      .withMessage('Le programme est obligatoire.')
      .isMongoId()
      .withMessage('L’identifiant du programme est invalide.'),
   body('configuration.level')
      .trim()
      .notEmpty()
      .withMessage('Le niveau est obligatoire.')
      .isLength({ max: 50 })
      .withMessage('Le niveau ne peut pas dépasser 50 caractères.'),
   body('configuration.module')
      .notEmpty()
      .withMessage('Le module est obligatoire.')
      .isIn(['MODULE_1', 'MODULE_2'])
      .withMessage('Le module doit être MODULE_1 ou MODULE_2.'),
   body('configuration.coefficient')
      .isFloat({ gt: 0 })
      .withMessage('Le coefficient doit être supérieur à zéro.')
      .toFloat(),
   body('configuration.calculationRules')
      .custom(
         (value) =>
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.keys(value).every((key) =>
               ['evaluationMethod', 'componentWeights'].includes(key)
            )
      )
      .withMessage('Les règles de calcul sont obligatoires.'),
   body('configuration.calculationRules.evaluationMethod')
      .notEmpty()
      .withMessage('La méthode de calcul des évaluations est obligatoire.')
      .isIn(['ARITHMETIC_MEAN', 'WEIGHTED_MEAN'])
      .withMessage('La méthode de calcul des évaluations est invalide.'),
   body('configuration.calculationRules.componentWeights')
      .optional()
      .custom(
         (value) =>
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            ['oral', 'written', 'composition'].every((key) => key in value) &&
            Object.keys(value).every((key) =>
               ['oral', 'written', 'composition'].includes(key)
            )
      )
      .withMessage(
         'Les pondérations doivent définir oral, écrit et composition.'
      ),
   ...['oral', 'written', 'composition'].map((component) =>
      body(`configuration.calculationRules.componentWeights.${component}`)
         .optional()
         .isFloat({ gt: 0 })
         .withMessage('Chaque pondération doit être supérieure à zéro.')
         .toFloat()
   ),
];

export const updateSubjectValidator = [
   ...subjectIdValidator,
   body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Le nom doit contenir entre 2 et 150 caractères.'),
   body('code')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Le code doit contenir entre 1 et 30 caractères.')
      .toUpperCase(),
   body('description').optional().trim(),
   body('isActive').optional().isBoolean().toBoolean(),
];

export const subjectConfigurationListValidator = optionalObjectIdFilters([
   'academicYear',
   'program',
   'subject',
]);
subjectConfigurationListValidator.push(
   query('level').optional().trim().isLength({ max: 50 })
);

export const teachingAssignmentListValidator = optionalObjectIdFilters([
   'teacher',
   'subject',
   'program',
   'class',
   'academicYear',
]);

export const createTeachingAssignmentValidator = [
   body('teacher')
      .notEmpty()
      .withMessage('L’enseignant est obligatoire.')
      .isMongoId()
      .withMessage('L’identifiant de l’enseignant est invalide.'),
   body('subject')
      .notEmpty()
      .withMessage('La matière est obligatoire.')
      .isMongoId()
      .withMessage('L’identifiant de la matière est invalide.'),
   body('program')
      .notEmpty()
      .withMessage('Le programme est obligatoire.')
      .isMongoId()
      .withMessage('L’identifiant du programme est invalide.'),
   body('class')
      .notEmpty()
      .withMessage('La classe est obligatoire.')
      .isMongoId()
      .withMessage('L’identifiant de la classe est invalide.'),
   body('academicYear')
      .notEmpty()
      .withMessage("L'année académique est obligatoire.")
      .isMongoId()
      .withMessage("L'identifiant de l'année académique est invalide."),
];
