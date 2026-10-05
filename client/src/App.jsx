import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
   apiRequest,
   login,
   requestPasswordReset,
   resetPassword,
   updatePassword,
} from './api.js';
import {
   calculateGradeScore,
   isGradeEditable,
   pickPreferredEvaluation,
} from './utils/gradeUtils.js';

const ROLE_LABELS = {
   ADMIN: 'Administrateur général',
   DIRECTEUR_SCOLARITE: 'Direction de la scolarité',
   DIRECTEUR_ETUDES: 'Direction des études',
   ENSEIGNANT: 'Enseignant',
   ELEVE: 'Élève',
};

const USER_STATUS_LABELS = {
   ACTIVE: 'Actif',
   BLOCKED: 'Bloqué',
   DISABLED: 'Désactivé',
};

const ENROLLMENT_STATUS_LABELS = {
   PENDING: 'En attente',
   APPROVED: 'Approuvée',
   REJECTED: 'Rejetée · à corriger',
};

const ACADEMIC_YEAR_STATUS_LABELS = {
   PENDING: 'À venir',
   ACTIVE: 'En cours',
   CLOSED: 'Clôturée',
};

const formatUserStatus = (status) => USER_STATUS_LABELS[status] || status;
const formatEnrollmentStatus = (status) =>
   ENROLLMENT_STATUS_LABELS[status] || status;
const formatAcademicYearStatus = (status) =>
   ACADEMIC_YEAR_STATUS_LABELS[status] || status;

const STAFF_ROLES = [
   'ADMIN',
   'DIRECTEUR_SCOLARITE',
   'DIRECTEUR_ETUDES',
   'ENSEIGNANT',
];

const EVALUATION_PERIOD_LABELS = {
   MODULE_1: 'Premier module',
   MODULE_2: 'Deuxième module',
};

const EVALUATION_TYPE_LABELS = {
   NORMAL: 'Évaluation principale',
   RETAKE: 'Rattrapage',
};

const GRADE_STATUS_LABELS = {
   DRAFT: 'Brouillon',
   SUBMITTED: 'Soumise',
   NEEDS_CORRECTION: 'À corriger',
   VALIDATED: 'Validée',
   LOCKED: 'Verrouillée',
   NOT_ENTERED: 'Non saisie',
};

const formatGradeStatus = (status) =>
   GRADE_STATUS_LABELS[status] || status || 'Non saisie';

const gradeStatusClass = (status) =>
   status === 'VALIDATED'
      ? 'status-active'
      : status === 'SUBMITTED'
        ? 'status-info'
        : status === 'NEEDS_CORRECTION'
          ? 'status-pending'
          : status === 'LOCKED'
            ? 'status-muted'
            : '';

const formatEvaluationStatus = (status) =>
   status === 'OPEN' ? 'Ouverte' : status === 'CLOSED' ? 'Clôturée' : '—';

const formatEvaluationPeriod = (period) =>
   EVALUATION_PERIOD_LABELS[period] || period || 'Module non défini';
const formatEvaluationType = (type) =>
   EVALUATION_TYPE_LABELS[type] || type || 'Évaluation';
const AUDIT_ACTION_LABELS = {
   USER_CREATED: 'Compte créé',
   USER_DELETED: 'Compte supprimé',
   USER_STATUS_CHANGED: 'Statut du compte modifié',
   STUDENT_CREATED: 'Élève enregistré',
   STUDENT_DELETED: 'Dossier élève supprimé',
   ENROLLMENT_CREATED: 'Inscription créée',
   ENROLLMENT_APPROVED: 'Inscription approuvée',
   ENROLLMENT_REJECTED: 'Inscription rejetée',
   ENROLLMENT_RESUBMITTED: 'Inscription renvoyée',
   ACADEMIC_YEAR_CREATED: 'Année scolaire créée',
   ACADEMIC_YEAR_STATUS_CHANGED: 'Statut de l’année modifié',
   PROGRAM_CREATED: 'Programme créé',
   CLASS_CREATED: 'Classe créée',
   SUBJECT_CREATED: 'Matière créée',
   SUBJECT_UPDATED: 'Matière modifiée',
   SUBJECT_CONFIGURATION_CREATED: 'Configuration matière créée',
   SUBJECT_CONFIGURATION_UPDATED: 'Configuration matière modifiée',
   TEACHING_ASSIGNMENT_CREATED: 'Affectation créée',
   ACADEMIC_SETTINGS_UPDATED: 'Règles générales modifiées',
   GLOBAL_SETTINGS_UPDATED: 'Règles générales modifiées',
   GLOBAL_SCALE_UPDATED: 'Barème général commun modifié',
   EVALUATION_CREATED: 'Évaluation créée',
   EVALUATION_CLOSED: 'Évaluation clôturée',
   GRADE_DRAFT_CREATED: 'Notes saisies',
   GRADE_DRAFT_UPDATED: 'Notes modifiées',
   GRADE_SUBMITTED: 'Notes soumises',
   GRADE_VALIDATED: 'Note validée',
   GRADE_RETURNED: 'Note renvoyée en correction',
   GRADE_LOCKED: 'Note verrouillée',
   GRADE_CORRECTION_REQUESTED: 'Correction demandée',
   GRADE_CORRECTION_APPROVED: 'Correction autorisée',
   GRADE_CORRECTION_REJECTED: 'Correction refusée',
};

const AUDIT_ENTITY_LABELS = {
   User: 'Compte utilisateur',
   Student: 'Élève',
   Enrollment: 'Inscription',
   AcademicYear: 'Année scolaire',
   Program: 'Programme',
   Class: 'Classe',
   Subject: 'Matière',
   TeachingAssignment: 'Affectation',
   AcademicSettings: 'Règles générales',
   GlobalScale: 'Règles générales',
   Evaluation: 'Évaluation',
   Grade: 'Note',
};

const auditActionLabel = (action) =>
   AUDIT_ACTION_LABELS[action] ||
   action.replaceAll('_', ' ').toLocaleLowerCase('fr');
const auditEntityLabel = (entityType) =>
   AUDIT_ENTITY_LABELS[entityType] || entityType;

function LoginForm({ onLogin }) {
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [matricule, setMatricule] = useState('');
   const [registerMode, setRegisterMode] = useState(false);
   const [forgotMode, setForgotMode] = useState(false);
   const [error, setError] = useState('');
   const [notice, setNotice] = useState('');
   const [busy, setBusy] = useState(false);

   const submit = async (event) => {
      event.preventDefault();
      setError('');
      setNotice('');
      setBusy(true);
      try {
         if (forgotMode) {
            await requestPasswordReset(email);
            setNotice(
               'Si cette adresse correspond à un compte actif, un lien de réinitialisation sera envoyé. Vérifiez aussi vos courriers indésirables.'
            );
            return;
         }
         const result = registerMode
            ? await apiRequest('/auth/register-student', {
                 method: 'POST',
                 body: { matricule, email, password },
              })
            : await login({ email, password });
         await onLogin(result);
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   return (
      <main className="auth-layout">
         <section className="auth-aside">
            <div className="brand-mark">IP</div>
            <p className="eyebrow">ESPACE ACADÉMIQUE</p>
            <h1>IPROFIC Nelson Mandela</h1>
            <p className="muted-light">
               Un espace sécurisé pour suivre la scolarité, les évaluations et
               les résultats.
            </p>
            <div className="aside-foot">
               Gestion des notes · Années, classes et résultats réunis
            </div>
         </section>

         <section className="auth-main">
            <form className="auth-card" onSubmit={submit}>
               <p className="eyebrow">
                  {forgotMode
                     ? 'RÉCUPÉRATION DU COMPTE'
                     : registerMode
                       ? 'ESPACE ÉLÈVE'
                       : 'BON RETOUR'}
               </p>
               <h2>
                  {forgotMode
                     ? 'Mot de passe oublié ?'
                     : registerMode
                       ? 'Créer mon compte'
                       : 'Connexion'}
               </h2>
               <p className="muted">
                  {forgotMode
                     ? 'Indiquez l’adresse email liée à votre compte pour recevoir un lien sécurisé.'
                     : registerMode
                       ? 'Votre inscription doit être approuvée et votre matricule doit être connu.'
                       : 'Connectez-vous avec les identifiants fournis par votre établissement.'}
               </p>

               {registerMode && (
                  <>
                     <label htmlFor="matricule">Matricule</label>
                     <input
                        id="matricule"
                        value={matricule}
                        onChange={(event) => setMatricule(event.target.value)}
                        autoComplete="off"
                        required
                     />
                  </>
               )}

               <label htmlFor="email">Adresse email</label>
               <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
               />

               {!forgotMode && (
                  <>
                     <label htmlFor="password">Mot de passe</label>
                     <input
                        id="password"
                        type="password"
                        autoComplete={
                           registerMode ? 'new-password' : 'current-password'
                        }
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={registerMode ? 8 : undefined}
                        required
                     />{' '}
                  </>
               )}

               {error && <p className="alert alert-error">{error}</p>}
               {notice && <p className="alert alert-success">{notice}</p>}
               <button
                  className="button button-primary button-wide"
                  disabled={busy}>
                  {busy
                     ? 'Veuillez patienter…'
                     : forgotMode
                       ? 'Envoyer le lien'
                       : registerMode
                         ? 'Créer mon compte'
                         : 'Se connecter'}
               </button>
               {!forgotMode && registerMode && (
                  <p className="form-note">
                     Un compte ne peut être créé qu’après approbation de votre
                     inscription.
                  </p>
               )}
               {!registerMode && !forgotMode && (
                  <button
                     className="text-button auth-secondary-link"
                     type="button"
                     onClick={() => {
                        setForgotMode(true);
                        setError('');
                        setNotice('');
                     }}>
                     Mot de passe oublié ?
                  </button>
               )}
               {forgotMode && (
                  <button
                     className="text-button auth-secondary-link"
                     type="button"
                     onClick={() => {
                        setForgotMode(false);
                        setError('');
                        setNotice('');
                     }}>
                     Retour à la connexion
                  </button>
               )}
               {!forgotMode && (
                  <button
                     className="text-button"
                     type="button"
                     onClick={() => {
                        setRegisterMode((current) => !current);
                        setError('');
                        setNotice('');
                     }}>
                     {registerMode
                        ? 'J’ai déjà un compte'
                        : 'Créer un compte élève'}
                  </button>
               )}
            </form>
         </section>
      </main>
   );
}

function ResetPasswordForm({ token }) {
   const [password, setPassword] = useState('');
   const [confirmation, setConfirmation] = useState('');
   const [error, setError] = useState('');
   const [busy, setBusy] = useState(false);
   const [done, setDone] = useState(false);

   const submit = async (event) => {
      event.preventDefault();
      setError('');
      if (password !== confirmation) {
         setError('Les deux mots de passe ne correspondent pas.');
         return;
      }
      setBusy(true);
      try {
         await resetPassword(token, password);
         setDone(true);
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   return (
      <main className="auth-layout single-layout">
         <section className="auth-main">
            <form className="auth-card" onSubmit={submit}>
               <p className="eyebrow">RÉCUPÉRATION DU COMPTE</p>
               <h2>
                  {done
                     ? 'Mot de passe modifié'
                     : 'Choisissez un nouveau mot de passe'}
               </h2>
               {done ? (
                  <>
                     <p className="muted">
                        Votre mot de passe a été réinitialisé. Vous pouvez
                        maintenant vous connecter.
                     </p>
                     <button
                        className="button button-primary button-wide"
                        type="button"
                        onClick={() =>
                           window.location.assign(window.location.pathname)
                        }>
                        Retour à la connexion
                     </button>
                  </>
               ) : (
                  <>
                     <p className="muted">
                        Le lien est valable pendant une heure. Choisissez un mot
                        de passe de 8 caractères minimum.
                     </p>
                     <label htmlFor="reset-password">
                        Nouveau mot de passe
                     </label>
                     <input
                        id="reset-password"
                        type="password"
                        autoComplete="new-password"
                        minLength="8"
                        maxLength="128"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                     />
                     <label htmlFor="reset-password-confirm">
                        Confirmer le mot de passe
                     </label>
                     <input
                        id="reset-password-confirm"
                        type="password"
                        autoComplete="new-password"
                        minLength="8"
                        maxLength="128"
                        value={confirmation}
                        onChange={(event) =>
                           setConfirmation(event.target.value)
                        }
                        required
                     />
                     {error && <p className="alert alert-error">{error}</p>}
                     <button
                        className="button button-primary button-wide"
                        disabled={busy}>
                        {busy
                           ? 'Enregistrement…'
                           : 'Réinitialiser le mot de passe'}
                     </button>
                  </>
               )}
            </form>
         </section>
      </main>
   );
}

function ModalDialog({ eyebrow, title, onClose, children }) {
   const dialogRef = useRef(null);
   const onCloseRef = useRef(onClose);
   const [validationError, setValidationError] = useState('');

   const handleInvalid = (event) => {
      event.preventDefault();
      const field = event.target;
      const label = field.labels?.[0]?.innerText?.trim().replace(/\s+/g, ' ');
      let message = 'Vérifiez la valeur saisie.';
      if (field.validity.valueMissing) message = 'Ce champ est obligatoire.';
      else if (field.validity.typeMismatch)
         message = 'Le format saisi n’est pas valide.';
      else if (field.validity.patternMismatch)
         message = 'Le format demandé n’est pas respecté.';
      else if (field.validity.rangeUnderflow)
         message = `La valeur minimale est ${field.min}.`;
      else if (field.validity.rangeOverflow)
         message = `La valeur maximale est ${field.max}.`;
      else if (field.validity.stepMismatch)
         message = 'La valeur ne respecte pas le pas demandé.';
      else if (field.validity.tooShort)
         message = `Saisissez au moins ${field.minLength} caractères.`;
      else if (field.validity.tooLong)
         message = `Saisissez au maximum ${field.maxLength} caractères.`;
      setValidationError(`${label ? `${label} : ` : ''}${message}`);
      dialogRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      requestAnimationFrame(() => field.focus());
   };

   useEffect(() => {
      onCloseRef.current = onClose;
   }, [onClose]);

   useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return undefined;
      const observer = new MutationObserver(() => {
         dialog
            .querySelector('.alert-error')
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      observer.observe(dialog, { childList: true, subtree: true });
      return () => observer.disconnect();
   }, []);

   useEffect(() => {
      const handleKeyDown = (event) => {
         if (event.key === 'Escape') {
            event.preventDefault();
            onCloseRef.current();
            return;
         }
         if (event.key !== 'Tab' || !dialogRef.current) return;
         const focusable = dialogRef.current.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
         );
         if (!focusable.length) {
            event.preventDefault();
            dialogRef.current.focus();
            return;
         }
         const first = focusable[0];
         const last = focusable[focusable.length - 1];
         if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
         } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
         }
      };
      const previousFocus = document.activeElement;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      requestAnimationFrame(() => {
         const firstFocusable = dialogRef.current?.querySelector(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
         );
         (firstFocusable || dialogRef.current)?.focus();
      });
      return () => {
         document.body.style.overflow = previousOverflow;
         window.removeEventListener('keydown', handleKeyDown);
         if (previousFocus instanceof HTMLElement) previousFocus.focus();
      };
   }, []);

   return (
      <div
         className="modal-backdrop"
         onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
         }}>
         <section
            className="modal-dialog"
            ref={dialogRef}
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onInvalidCapture={handleInvalid}
            onInputCapture={() => setValidationError('')}
            onChangeCapture={() => setValidationError('')}>
            <header className="modal-heading">
               <div>
                  <p className="eyebrow">{eyebrow}</p>
                  <h2 id="modal-title">{title}</h2>
               </div>
               <button
                  className="modal-close"
                  type="button"
                  aria-label="Fermer"
                  onClick={onClose}>
                  ×
               </button>
            </header>
            {validationError && (
               <p
                  className="alert alert-error modal-validation-error"
                  role="alert"
                  aria-live="assertive">
                  {validationError}
               </p>
            )}
            {children}
         </section>
      </div>
   );
}

function ChangePasswordForm({ token, onComplete, onLogout }) {
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [error, setError] = useState('');
   const [busy, setBusy] = useState(false);

   const submit = async (event) => {
      event.preventDefault();
      setError('');
      setBusy(true);
      try {
         await onComplete(
            await updatePassword(token, currentPassword, newPassword)
         );
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   return (
      <main className="auth-layout single-layout">
         <form className="auth-card" onSubmit={submit}>
            <p className="eyebrow">ACTION REQUISE</p>
            <h2>Choisissez un nouveau mot de passe</h2>
            <p className="muted">
               Votre compte utilise un mot de passe temporaire. Modifiez-le pour
               continuer.
            </p>
            <label htmlFor="current-password">Mot de passe actuel</label>
            <input
               id="current-password"
               type="password"
               autoComplete="current-password"
               value={currentPassword}
               onChange={(event) => setCurrentPassword(event.target.value)}
               required
            />
            <label htmlFor="new-password">Nouveau mot de passe</label>
            <input
               id="new-password"
               type="password"
               autoComplete="new-password"
               minLength={8}
               value={newPassword}
               onChange={(event) => setNewPassword(event.target.value)}
               required
            />
            {error && <p className="alert alert-error">{error}</p>}
            <button
               className="button button-primary button-wide"
               disabled={busy}>
               {busy ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
            </button>
            <button
               className="button button-quiet button-wide"
               type="button"
               onClick={onLogout}>
               Se déconnecter
            </button>
         </form>
      </main>
   );
}

function MetricCard({ label, value, icon, onClick }) {
   const content = (
      <>
         <div className="metric-card-top">
            <span className="metric-card-icon" aria-hidden="true">
               {icon}
            </span>
            {onClick && (
               <span className="metric-card-arrow" aria-hidden="true">
                  ↗
               </span>
            )}
         </div>
         <p>{label}</p>
         <strong>{value ?? '—'}</strong>
         {onClick && (
            <span className="metric-card-hint">Ouvrir la rubrique</span>
         )}
      </>
   );

   return onClick ? (
      <button
         type="button"
         className="metric-card metric-card-action"
         onClick={onClick}
         aria-label={`${label} : ${value ?? 'aucune donnée'}. Ouvrir la rubrique`}>
         {content}
      </button>
   ) : (
      <article className="metric-card">{content}</article>
   );
}

function DashboardMetrics({ dashboard, onNavigate }) {
   const role = dashboard.role;
   let metrics = [];

   if (role === 'ADMIN') {
      metrics = [
         [
            'Dossiers à traiter',
            dashboard.enrollments?.pending,
            'enrollments',
            '▤',
         ],
         [
            'Inscriptions approuvées',
            dashboard.enrollments?.approved,
            'enrollments',
            '✓',
         ],
         [
            'Notes à contrôler',
            dashboard.gradeStatuses?.SUBMITTED ?? 0,
            null,
            '✎',
         ],
         ['Comptes utilisateurs', dashboard.users, 'users', '♙'],
      ];
   } else if (role === 'DIRECTEUR_SCOLARITE') {
      metrics = [
         ['Élèves', dashboard.students, 'classes', '♙'],
         [
            'À traiter',
            dashboard.enrollmentStatuses?.pending,
            'enrollments',
            '◷',
         ],
         [
            'Corrections demandées',
            dashboard.enrollmentStatuses?.rejected,
            'enrollments',
            '↻',
         ],
         ['Inscriptions', dashboard.enrollments, 'enrollments', '▤'],
      ];
   } else if (role === 'DIRECTEUR_ETUDES') {
      metrics = [
         ['Classes actives', dashboard.classes, 'classes', '▦'],
         ['Enseignants', dashboard.teachers, null, '♙'],
         [
            'Notes à contrôler',
            dashboard.gradeStatuses?.SUBMITTED ?? 0,
            'pedagogy',
            '✎',
            'grades',
         ],
         ['Évaluations', dashboard.evaluations, 'pedagogy', '✓', 'evaluations'],
      ];
   } else if (role === 'ENSEIGNANT') {
      metrics = [
         ['Affectations', dashboard.assignments?.length, null, '▦'],
         ['Évaluations', dashboard.evaluations?.length, null, '✓'],
         ['Soumises', dashboard.grades?.SUBMITTED ?? 0, null, '↑'],
         ['À corriger', dashboard.grades?.NEEDS_CORRECTION ?? 0, null, '↻'],
      ];
   } else {
      const results = dashboard.results || [];
      const latest = results[0];
      metrics = [
         ['Années consultables', results.length, null, '▤'],
         [
            'Moyenne récente',
            latest?.average == null ? '—' : latest.average.toFixed(2),
            null,
            '∑',
         ],
         ['Résultat', latest?.decision || 'Provisoire', null, '✓'],
         [
            'Statut du relevé',
            latest?.status === 'FINAL' ? 'Définitif' : 'Provisoire',
            null,
            '◷',
         ],
      ];
   }

   return (
      <div className="metric-grid">
         {metrics.map(([label, value, panel, icon, view]) => (
            <MetricCard
               key={label}
               label={label}
               value={value}
               icon={icon}
               onClick={panel ? () => onNavigate(panel, view) : undefined}
            />
         ))}
      </div>
   );
}

function OverviewHero({
   user,
   dashboard,
   roleLabel,
   selectedYearId,
   loadingYear,
   onYearChange,
   onNavigate,
}) {
   const settings = {
      ADMIN: {
         text: 'Gardez une vue claire sur les inscriptions et le fonctionnement de l’établissement.',
         action: 'Traiter les inscriptions',
         panel: 'enrollments',
         icon: '✓',
      },
      DIRECTEUR_ETUDES: {
         text: 'Pilotez les classes, les évaluations et la progression pédagogique.',
         action: 'Ouvrir la pédagogie',
         panel: 'pedagogy',
         icon: '⌑',
      },
      DIRECTEUR_SCOLARITE: {
         text: 'Suivez les dossiers d’inscription et l’organisation des élèves.',
         action: 'Gérer les inscriptions',
         panel: 'enrollments',
         icon: '▤',
      },
      ENSEIGNANT: {
         text: 'Retrouvez vos évaluations et poursuivez la saisie des notes.',
         action: 'Accéder à mes évaluations',
         target: 'teacher-workspace',
         icon: '✎',
      },
      ELEVE: {
         text: 'Consultez vos résultats et retrouvez rapidement votre relevé scolaire.',
         action: 'Voir mes résultats',
         target: 'student-results',
         icon: '▧',
      },
   }[user.role];
   const pendingCount =
      user.role === 'ADMIN'
         ? dashboard.enrollments?.pending
         : user.role === 'DIRECTEUR_SCOLARITE'
           ? dashboard.enrollmentStatuses?.pending
           : user.role === 'DIRECTEUR_ETUDES'
             ? dashboard.gradeStatuses?.SUBMITTED
             : null;
   const action = () =>
      settings.target
         ? document
              .getElementById(settings.target)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
         : onNavigate(settings.panel);

   return (
      <section className="overview-hero">
         <div className="overview-hero-copy">
            <p className="eyebrow">VOTRE ESPACE · {roleLabel.toUpperCase()}</p>
            <h2>Bonjour {user.firstName || 'et bienvenue'}.</h2>
            <p>{settings.text}</p>
         </div>
         <div className="overview-hero-side">
            {dashboard.academicYears?.length > 0 && (
               <label className="overview-year-picker">
                  Année scolaire
                  <select
                     value={selectedYearId}
                     disabled={loadingYear}
                     onChange={(event) => onYearChange(event.target.value)}>
                     {dashboard.academicYears.map((year) => (
                        <option key={year._id} value={year._id}>
                           {year.label}
                           {year.status === 'ACTIVE' ? ' · En cours' : ''}
                        </option>
                     ))}
                  </select>
               </label>
            )}
            <div className="overview-hero-action">
               <span aria-hidden="true">{settings.icon}</span>
               <div>
                  <small>
                     {pendingCount == null
                        ? 'ACCÈS RAPIDE'
                        : `${pendingCount} À SUIVRE`}
                  </small>
                  <strong>
                     {loadingYear
                        ? 'Actualisation…'
                        : pendingCount == null
                          ? settings.action
                          : pendingCount
                            ? 'Une action vous attend'
                            : 'Tout est à jour'}
                  </strong>
               </div>
               <button
                  type="button"
                  aria-label={settings.action}
                  onClick={action}>
                  →
               </button>
            </div>
         </div>
      </section>
   );
}

function OverviewShortcuts({ role, onNavigate }) {
   const shortcuts =
      {
         ADMIN: [
            {
               label: 'Inscriptions',
               detail: 'Examiner les dossiers',
               panel: 'enrollments',
               icon: '▤',
            },
            {
               label: 'Classes et élèves',
               detail: 'Parcourir les classes',
               panel: 'classes',
               icon: '▦',
            },
            {
               label: 'Effectifs',
               detail: 'Voir les répartitions',
               panel: 'headcount',
               icon: '▥',
            },
            {
               label: 'Utilisateurs',
               detail: 'Gérer les comptes',
               panel: 'users',
               icon: '♙',
            },
         ],
         DIRECTEUR_ETUDES: [
            {
               label: 'Pédagogie',
               detail: 'Évaluations et notes',
               panel: 'pedagogy',
               icon: '⌑',
            },
            {
               label: 'Classes et élèves',
               detail: 'Consulter les classes',
               panel: 'classes',
               icon: '▦',
            },
            {
               label: 'Documents scolaires',
               detail: 'Rechercher un bulletin',
               panel: 'documents',
               icon: '▤',
            },
            {
               label: 'Effectifs',
               detail: 'Voir les répartitions',
               panel: 'headcount',
               icon: '▥',
            },
         ],
         DIRECTEUR_SCOLARITE: [
            {
               label: 'Inscriptions',
               detail: 'Suivre les dossiers',
               panel: 'enrollments',
               icon: '▤',
            },
            {
               label: 'Classes et élèves',
               detail: 'Consulter les classes',
               panel: 'classes',
               icon: '▦',
            },
            {
               label: 'Effectifs',
               detail: 'Voir les répartitions',
               panel: 'headcount',
               icon: '▥',
            },
         ],
         ENSEIGNANT: [
            {
               label: 'Mes évaluations',
               detail: 'Saisir et soumettre les notes',
               target: 'teacher-workspace',
               icon: '✎',
            },
            {
               label: 'Guide d’utilisation',
               detail: 'Consulter les étapes de saisie',
               panel: 'guide',
               icon: '?',
            },
         ],
         ELEVE: [
            {
               label: 'Mes résultats',
               detail: 'Consulter et imprimer mes relevés',
               target: 'student-results',
               icon: '▧',
            },
            {
               label: 'Guide d’utilisation',
               detail: 'Comprendre mes résultats',
               panel: 'guide',
               icon: '?',
            },
         ],
      }[role] || [];

   const activate = (shortcut) => {
      if (shortcut.target)
         document
            .getElementById(shortcut.target)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else onNavigate(shortcut.panel);
   };

   return (
      <section className="overview-shortcuts">
         <div className="overview-section-heading">
            <div>
               <p className="eyebrow">POUR ALLER PLUS VITE</p>
               <h3>Accès rapides</h3>
            </div>
         </div>
         <div className="overview-shortcut-grid">
            {shortcuts.map((shortcut) => (
               <button
                  type="button"
                  className="overview-shortcut"
                  key={shortcut.label}
                  onClick={() => activate(shortcut)}>
                  <span className="overview-shortcut-icon" aria-hidden="true">
                     {shortcut.icon}
                  </span>
                  <span className="overview-shortcut-copy">
                     <strong>{shortcut.label}</strong>
                     <small>{shortcut.detail}</small>
                  </span>
                  <span className="overview-shortcut-arrow" aria-hidden="true">
                     →
                  </span>
               </button>
            ))}
         </div>
      </section>
   );
}

function TeacherOverview({
   user,
   dashboard,
   token,
   selectedYearId,
   loadingYear,
   onYearChange,
   onRefresh,
}) {
   const assignments = dashboard.assignments || [];
   const evaluations = dashboard.evaluations || [];
   const classCount = new Set(
      assignments.map((assignment) => assignment.class?._id).filter(Boolean)
   ).size;
   const openCount = evaluations.filter(
      (evaluation) => evaluation.status === 'OPEN'
   ).length;
   const pendingCount =
      (dashboard.grades?.DRAFT || 0) +
      (dashboard.grades?.NEEDS_CORRECTION || 0);

   return (
      <div className="teacher-overview" aria-busy={loadingYear}>
         <header className="teacher-overview-hero">
            <div className="teacher-overview-copy">
               <p className="eyebrow">ESPACE ENSEIGNANT</p>
               <h2>Bonjour {user.firstName || 'et bienvenue'}.</h2>
               <p>
                  {classCount
                     ? `${classCount} classe${classCount === 1 ? '' : 's'} affectée${classCount === 1 ? 'e' : 's'} · ${openCount} évaluation${openCount === 1 ? '' : 's'} ouverte${openCount === 1 ? '' : 's'}`
                     : 'Aucune classe affectée pour cette année scolaire.'}
               </p>
            </div>
            <label className="teacher-year-picker">
               Année scolaire
               <select
                  value={selectedYearId}
                  disabled={loadingYear}
                  onChange={(event) => onYearChange(event.target.value)}>
                  {dashboard.academicYears?.map((year) => (
                     <option key={year._id} value={year._id}>
                        {year.label}
                        {year.status === 'ACTIVE' ? ' · En cours' : ''}
                     </option>
                  ))}
               </select>
            </label>
         </header>
         <div
            className="teacher-overview-stats"
            aria-label="Activité pédagogique">
            <article>
               <span>CLASSES</span>
               <strong>{classCount}</strong>
               <small>affectées</small>
            </article>
            <article>
               <span>ÉVALUATIONS</span>
               <strong>{openCount}</strong>
               <small>ouvertes</small>
            </article>
            <article>
               <span>NOTES À TRAITER</span>
               <strong>{pendingCount}</strong>
               <small>brouillons ou corrections</small>
            </article>
            <article>
               <span>NOTES SOUMISES</span>
               <strong>{dashboard.grades?.SUBMITTED || 0}</strong>
               <small>en attente de contrôle</small>
            </article>
         </div>
         {loadingYear && (
            <p className="teacher-overview-loading" role="status">
               Actualisation de l’année scolaire…
            </p>
         )}
         <fieldset
            className="teacher-workspace-fieldset"
            disabled={loadingYear}>
            <TeacherWorkspace
               key={selectedYearId}
               token={token}
               assignments={assignments}
               evaluations={evaluations}
               onRefresh={onRefresh}
            />
         </fieldset>
      </div>
   );
}

function ManagementTabs({ label, tabs, active, onChange }) {
   return (
      <nav className="workspace-tabs" aria-label={label} role="tablist">
         {tabs.map((tab) => (
            <button
               key={tab.id}
               type="button"
               role="tab"
               aria-selected={active === tab.id}
               className={
                  active === tab.id ? 'workspace-tab active' : 'workspace-tab'
               }
               onClick={() => onChange(tab.id)}>
               {tab.label}
               <span>{tab.count}</span>
            </button>
         ))}
      </nav>
   );
}

function MatriculeFilter({ value, onChange, id, count, total }) {
   return (
      <div className="matricule-filter-row">
         <label className="student-search" htmlFor={id}>
            Filtrer par matricule
            <input
               id={id}
               type="search"
               value={value}
               onChange={(event) => onChange(event.target.value)}
               placeholder="Ex. ETU-2026-001"
            />
         </label>
         {Number.isFinite(count) && Number.isFinite(total) && (
            <span className="muted matricule-filter-count">
               {count} / {total}
            </span>
         )}
      </div>
   );
}

function SortableHeader({ label, column, sort, onSort }) {
   const active = sort.column === column;
   return (
      <th
         aria-sort={
            active
               ? sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
               : 'none'
         }>
         <button
            type="button"
            className="sortable-header"
            onClick={() => onSort(column)}>
            {label}
            <span aria-hidden="true">
               {active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
            </span>
         </button>
      </th>
   );
}

function UsersPanel({ token, currentUserId }) {
   const [users, setUsers] = useState([]);
   const [createModalOpen, setCreateModalOpen] = useState(false);
   const [form, setForm] = useState({
      firstName: '',
      lastName: '',
      email: '',
      role: 'DIRECTEUR_SCOLARITE',
   });
   const [temporaryPassword, setTemporaryPassword] = useState('');
   const [statusFilter, setStatusFilter] = useState('all');
   const [search, setSearch] = useState('');
   const [error, setError] = useState('');
   const [notice, setNotice] = useState('');
   const [busy, setBusy] = useState(false);
   const [deleteTarget, setDeleteTarget] = useState(null);

   const refresh = useCallback(async () => {
      setUsers(await apiRequest('/users', { token }));
   }, [token]);

   useEffect(() => {
      refresh().catch((requestError) => setError(requestError.message));
   }, [refresh]);

   const createUser = async (event) => {
      event.preventDefault();
      setError('');
      setNotice('');
      setTemporaryPassword('');
      setBusy(true);
      try {
         const result = await apiRequest('/users', {
            token,
            method: 'POST',
            body: form,
         });
         setTemporaryPassword(result.temporaryPassword);
         setNotice(
            'Compte créé. Transmettez le mot de passe temporaire de façon sécurisée.'
         );
         setForm({
            firstName: '',
            lastName: '',
            email: '',
            role: 'DIRECTEUR_SCOLARITE',
         });
         await refresh();
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   const updateStatus = async (user) => {
      const status = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      setError('');
      try {
         await apiRequest(`/users/${user._id}/status`, {
            token,
            method: 'PATCH',
            body: { status },
         });
         await refresh();
      } catch (requestError) {
         setError(requestError.message);
      }
   };

   const deleteAccount = async () => {
      if (!deleteTarget) return;
      setError('');
      setBusy(true);
      try {
         await apiRequest(`/users/${deleteTarget._id}`, {
            token,
            method: 'DELETE',
         });
         setDeleteTarget(null);
         setNotice('Compte supprimé.');
         await refresh();
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   const normalizedSearch = search.trim().toLocaleLowerCase('fr');
   const visibleUsers = users.filter(
      (user) =>
         (statusFilter === 'all' || user.status === statusFilter) &&
         (!normalizedSearch ||
            `${user.firstName} ${user.lastName} ${user.email}`
               .toLocaleLowerCase('fr')
               .includes(normalizedSearch))
   );
   const activeUsers = users.filter((user) => user.status === 'ACTIVE').length;
   const disabledUsers = users.length - activeUsers;

   return (
      <section className="users-workspace">
         {error && !createModalOpen && !deleteTarget && (
            <p className="alert alert-error">{error}</p>
         )}
         <div className="panel users-panel">
            <div className="panel-heading users-panel-heading">
               <div>
                  <p className="eyebrow">CATALOGUE</p>
                  <h3>Comptes utilisateurs</h3>
                  <p className="muted">
                     Gérez les accès et consultez les comptes par statut.
                  </p>
               </div>
               <div className="users-panel-actions">
                  <button
                     className="button button-secondary"
                     onClick={() =>
                        refresh().catch((requestError) =>
                           setError(requestError.message)
                        )
                     }>
                     Actualiser
                  </button>
                  <button
                     className="button button-primary"
                     onClick={() => {
                        setError('');
                        setNotice('');
                        setTemporaryPassword('');
                        setCreateModalOpen(true);
                     }}>
                     Créer un compte
                  </button>
               </div>
            </div>
            <ManagementTabs
               label="Statut des comptes"
               active={statusFilter}
               onChange={setStatusFilter}
               tabs={[
                  { id: 'all', label: 'Tous', count: users.length },
                  { id: 'ACTIVE', label: 'Actifs', count: activeUsers },
                  { id: 'DISABLED', label: 'Désactivés', count: disabledUsers },
               ]}
            />
            <label className="management-search">
               Rechercher un compte
               <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nom, prénom ou adresse email"
               />
            </label>
            {createModalOpen && (
               <ModalDialog
                  eyebrow="ADMINISTRATION"
                  title="Créer un compte du personnel"
                  onClose={() => setCreateModalOpen(false)}>
                  <form className="form-grid" onSubmit={createUser}>
                     <label>
                        Prénom
                        <input
                           value={form.firstName}
                           onChange={(event) =>
                              setForm({
                                 ...form,
                                 firstName: event.target.value,
                              })
                           }
                           required
                        />
                     </label>
                     <label>
                        Nom
                        <input
                           value={form.lastName}
                           onChange={(event) =>
                              setForm({ ...form, lastName: event.target.value })
                           }
                           required
                        />
                     </label>
                     <label className="span-2">
                        Email
                        <input
                           type="email"
                           value={form.email}
                           onChange={(event) =>
                              setForm({ ...form, email: event.target.value })
                           }
                           required
                        />
                     </label>
                     <label className="span-2">
                        Rôle
                        <select
                           value={form.role}
                           onChange={(event) =>
                              setForm({ ...form, role: event.target.value })
                           }>
                           {STAFF_ROLES.map((role) => (
                              <option key={role} value={role}>
                                 {ROLE_LABELS[role]}
                              </option>
                           ))}
                        </select>
                     </label>
                     {error && (
                        <p className="alert alert-error span-2">{error}</p>
                     )}
                     {notice && (
                        <p className="alert alert-success span-2">
                           {notice}
                           {temporaryPassword && (
                              <code className="temporary-password">
                                 {temporaryPassword}
                              </code>
                           )}
                        </p>
                     )}
                     <button
                        className="button button-primary span-2"
                        disabled={busy}>
                        {busy ? 'Création…' : 'Créer le compte'}
                     </button>
                  </form>
               </ModalDialog>
            )}
            {deleteTarget && (
               <ModalDialog
                  eyebrow="SUPPRESSION DE COMPTE"
                  title={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
                  onClose={() => {
                     setDeleteTarget(null);
                     setError('');
                  }}>
                  <div className="confirmation-content">
                     <p>
                        Supprimer le compte{' '}
                        <strong>{deleteTarget.email}</strong> ? Son acces sera
                        retire.
                     </p>
                     <p className="muted">
                        Les inscriptions, notes et dossiers scolaires restent
                        conserves. Seul le compte utilisateur est supprime.
                     </p>
                     {error && <p className="alert alert-error">{error}</p>}
                     <div className="modal-actions">
                        <button
                           className="button button-secondary"
                           type="button"
                           onClick={() => {
                              setDeleteTarget(null);
                              setError('');
                           }}>
                           Annuler
                        </button>
                        <button
                           className="button button-danger"
                           type="button"
                           disabled={busy}
                           onClick={deleteAccount}>
                           {busy ? 'Suppression…' : 'Supprimer le compte'}
                        </button>
                     </div>
                  </div>
               </ModalDialog>
            )}
            <div className="table-wrap">
               <table>
                  <thead>
                     <tr>
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th>Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {visibleUsers.map((user) => (
                        <tr key={user._id}>
                           <td>
                              {user.firstName} {user.lastName}
                           </td>
                           <td>{user.email}</td>
                           <td>{ROLE_LABELS[user.role] || user.role}</td>
                           <td>
                              <span
                                 className={`status-pill ${user.status === 'ACTIVE' ? 'status-active' : 'status-muted'}`}>
                                 {formatUserStatus(user.status)}
                              </span>
                           </td>
                           <td>
                              {user._id === currentUserId ? (
                                 <span className="muted">Compte actuel</span>
                              ) : (
                                 <div className="row-actions">
                                    <button
                                       className="text-button"
                                       onClick={() => updateStatus(user)}>
                                       {user.status === 'ACTIVE'
                                          ? 'Désactiver'
                                          : 'Activer'}
                                    </button>
                                    <button
                                       className="text-button danger-text"
                                       onClick={() => {
                                          setError('');
                                          setDeleteTarget(user);
                                       }}>
                                       Supprimer
                                    </button>
                                 </div>
                              )}
                           </td>
                        </tr>
                     ))}
                     {!visibleUsers.length && (
                        <tr>
                           <td colSpan="5" className="empty-cell">
                              {users.length
                                 ? 'Aucun compte ne correspond à votre recherche.'
                                 : 'Aucun compte à afficher.'}
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </section>
   );
}

function ExceptionalGradesPanel({ token }) {
   const [evaluations, setEvaluations] = useState([]);
   const [grades, setGrades] = useState([]);
   const [selectedEvaluation, setSelectedEvaluation] = useState('');
   const [selectedYear, setSelectedYear] = useState('');
   const [selectedClass, setSelectedClass] = useState('');
   const [matriculeFilter, setMatriculeFilter] = useState('');
   const [edits, setEdits] = useState({});
   const [error, setError] = useState('');
   const [notice, setNotice] = useState('');
   const [busyId, setBusyId] = useState('');

   const refreshEvaluations = useCallback(async () => {
      const data = await apiRequest('/grades/correction-requests', { token });
      const evaluationMap = new Map();
      data.forEach((request) => {
         const evaluation = request.grade?.evaluation;
         if (evaluation?._id) evaluationMap.set(evaluation._id, evaluation);
      });
      const evaluationData = [...evaluationMap.values()];
      setEvaluations(evaluationData);
      const years = [
         ...new Map(
            evaluationData
               .filter((item) => item.assignment?.academicYear?._id)
               .map((item) => [
                  item.assignment.academicYear._id,
                  item.assignment.academicYear,
               ])
         ).values(),
      ];
      const activeYear = years.find((year) => year.status === 'ACTIVE');
      setSelectedYear(
         (current) =>
            current ||
            activeYear?._id ||
            years.sort((first, second) =>
               second.label.localeCompare(first.label, 'fr', { numeric: true })
            )[0]?._id ||
            ''
      );
   }, [token]);

   const refreshGrades = useCallback(
      async (evaluationId) => {
         if (!evaluationId) {
            setGrades([]);
            return;
         }
         const data = await apiRequest('/grades/correction-requests', {
            token,
         });
         setGrades(
            data
               .filter(
                  (request) => request.grade?.evaluation?._id === evaluationId
               )
               .map((request) => ({
                  ...request.grade,
                  correctionRequestId: request._id,
                  correctionRequestReason: request.reason,
                  requestedBy: request.requestedBy,
               }))
         );
         setEdits({});
      },
      [token]
   );

   useEffect(() => {
      refreshEvaluations().catch((requestError) =>
         setError(requestError.message)
      );
   }, [refreshEvaluations]);

   const save = async (grade, decision) => {
      const edit = edits[grade._id] || {};
      if (decision === 'REJECTED' && !edit.reason?.trim()) {
         setError('Le motif du refus est obligatoire.');
         return;
      }
      setError('');
      setNotice('');
      setBusyId(grade._id);
      try {
         await apiRequest(
            `/grades/${grade._id}/correction-requests/${grade.correctionRequestId}/review`,
            {
               token,
               method: 'PATCH',
               body: {
                  decision,
                  reason: edit.reason || '',
               },
            }
         );
         setNotice(
            decision === 'APPROVED'
               ? 'Demande autorisée. La note est rouverte pour l’enseignant.'
               : 'Demande refusée. La note reste verrouillée.'
         );
         await refreshEvaluations();
         await refreshGrades(selectedEvaluation);
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusyId('');
      }
   };

   const selected = evaluations.find(
      (evaluation) => evaluation._id === selectedEvaluation
   );
   const academicYears = [
      ...new Map(
         evaluations
            .filter((item) => item.assignment?.academicYear?._id)
            .map((item) => [
               item.assignment.academicYear._id,
               item.assignment.academicYear,
            ])
      ).values(),
   ].sort((first, second) =>
      second.label.localeCompare(first.label, 'fr', { numeric: true })
   );
   const yearEvaluations = evaluations.filter(
      (item) =>
         !selectedYear || item.assignment?.academicYear?._id === selectedYear
   );
   const availableClasses = [
      ...new Map(
         yearEvaluations
            .filter((item) => item.assignment?.class?._id)
            .map((item) => [item.assignment.class._id, item.assignment.class])
      ).values(),
   ].sort((first, second) =>
      first.name.localeCompare(second.name, 'fr', { sensitivity: 'base' })
   );
   const visibleEvaluations = yearEvaluations.filter(
      (item) => !selectedClass || item.assignment?.class?._id === selectedClass
   );
   const lockedGrades = grades
      .filter((grade) => grade.status === 'LOCKED')
      .sort((first, second) =>
         `${first.enrollment?.student?.lastName || ''} ${first.enrollment?.student?.firstName || ''}`.localeCompare(
            `${second.enrollment?.student?.lastName || ''} ${second.enrollment?.student?.firstName || ''}`,
            'fr',
            { sensitivity: 'base' }
         )
      );
   const normalizedMatricule = matriculeFilter.trim().toLocaleUpperCase('fr');
   const visibleLockedGrades = lockedGrades.filter(
      (grade) =>
         !normalizedMatricule ||
         grade.enrollment?.student?.matricule
            ?.toLocaleUpperCase('fr')
            .includes(normalizedMatricule)
   );

   const selectEvaluation = async (evaluationId) => {
      setSelectedEvaluation(evaluationId);
      setMatriculeFilter('');
      setError('');
      setNotice('');
      try {
         await refreshGrades(evaluationId);
      } catch (requestError) {
         setError(requestError.message);
      }
   };

   return (
      <section className="exceptional-grades-workspace">
         <header className="exceptional-grades-hero">
            <div>
               <p className="eyebrow">ADMINISTRATION · DÉCISIONS AUDITÉES</p>
               <h2>Corrections de notes</h2>
               <p>
                  Examinez les demandes de la Direction des études et autorisez
                  ou refusez la réouverture d’une note verrouillée. Chaque
                  décision est conservée dans le journal d’audit.
               </p>
            </div>
            <span className="exceptional-grades-mark" aria-hidden="true">
               ✎
            </span>
         </header>
         {error && <p className="alert alert-error">{error}</p>}
         {notice && <p className="alert alert-success">{notice}</p>}
         <div className="panel exceptional-evaluation-picker">
            <div className="exceptional-picker-heading">
               <p className="eyebrow">RECHERCHE CIBLÉE</p>
               <strong>Trouvez les notes à corriger</strong>
               <small>
                  {visibleEvaluations.length} évaluation
                  {visibleEvaluations.length === 1 ? '' : 's'} dans cette
                  sélection
               </small>
            </div>
            <div className="exceptional-picker-filters">
               <label>
                  Année scolaire
                  <select
                     value={selectedYear}
                     onChange={(event) => {
                        setSelectedYear(event.target.value);
                        setSelectedClass('');
                        setSelectedEvaluation('');
                        setGrades([]);
                        setMatriculeFilter('');
                     }}>
                     <option value="">Toutes les années</option>
                     {academicYears.map((year) => (
                        <option key={year._id} value={year._id}>
                           {year.label}
                           {year.status === 'ACTIVE' ? ' · En cours' : ''}
                        </option>
                     ))}
                  </select>
               </label>
               <label>
                  Classe
                  <select
                     value={selectedClass}
                     onChange={(event) => {
                        setSelectedClass(event.target.value);
                        setSelectedEvaluation('');
                        setGrades([]);
                        setMatriculeFilter('');
                     }}>
                     <option value="">Toutes les classes</option>
                     {availableClasses.map((schoolClass) => (
                        <option key={schoolClass._id} value={schoolClass._id}>
                           {schoolClass.name} · {schoolClass.level}
                        </option>
                     ))}
                  </select>
               </label>
               <label className="exceptional-evaluation-select">
                  Évaluation
                  <select
                     id="exceptional-evaluation-select"
                     value={selectedEvaluation}
                     onChange={(event) => selectEvaluation(event.target.value)}>
                     <option value="">Choisir une évaluation</option>
                     {visibleEvaluations.map((item) => (
                        <option key={item._id} value={item._id}>
                           {formatEvaluationPeriod(item.period)} ·{' '}
                           {formatEvaluationType(item.type)} · {item.name}
                        </option>
                     ))}
                  </select>
               </label>
            </div>
            <div className="exceptional-picker-side">
               <span>BARÈME</span>
               <strong>{selected ? `${selected.scale} pts` : '—'}</strong>
            </div>
         </div>
         {selected && (
            <>
               <div className="exceptional-summary">
                  <div>
                     <span>ÉVALUATION</span>
                     <strong>
                        {formatEvaluationPeriod(selected.period)} ·{' '}
                        {formatEvaluationType(selected.type)}
                     </strong>
                     <small>
                        {selected.name}
                        {selected.assignment?.class?.name
                           ? ` · ${selected.assignment.class.name}`
                           : ''}
                     </small>
                  </div>
                  <div>
                     <span>NOTES VERROUILLÉES</span>
                     <strong>{lockedGrades.length}</strong>
                     <small>Modifiables avec motif</small>
                  </div>
                  <div>
                     <span>RÉSULTATS AFFICHÉS</span>
                     <strong>{visibleLockedGrades.length}</strong>
                     <small>
                        {matriculeFilter
                           ? 'Après filtrage par matricule'
                           : 'Pour cette évaluation'}
                     </small>
                  </div>
               </div>
               <section className="panel exceptional-corrections-panel">
                  <div className="panel-heading exceptional-corrections-heading">
                     <div>
                        <p className="eyebrow">DEMANDES À TRAITER</p>
                        <h3>Corrections demandées</h3>
                        <p>
                           Vérifiez le motif de la Direction des études avant
                           d’autoriser ou de refuser la réouverture.
                        </p>
                     </div>
                  </div>
                  <MatriculeFilter
                     id="exceptional-grade-matricule"
                     value={matriculeFilter}
                     onChange={setMatriculeFilter}
                     count={visibleLockedGrades.length}
                     total={lockedGrades.length}
                  />
                  <div className="exceptional-grade-list">
                     {visibleLockedGrades.map((grade) => {
                        const student = grade.enrollment?.student;
                        const requestReason = edits[grade._id]?.reason || '';
                        return (
                           <article
                              className="exceptional-grade-card"
                              key={grade._id}>
                              <header className="exceptional-grade-card-heading">
                                 <div>
                                    <span className="exceptional-grade-matricule">
                                       {student?.matricule ||
                                          'Matricule inconnu'}
                                    </span>
                                    <strong>
                                       {student?.firstName} {student?.lastName}
                                    </strong>
                                 </div>
                                 <div className="exceptional-grade-average">
                                    <small>Note verrouillée</small>
                                    <strong>
                                       {grade.score == null
                                          ? '—'
                                          : grade.score.toFixed(2)}
                                    </strong>
                                 </div>
                              </header>
                              <p>
                                 {formatEvaluationPeriod(
                                    grade.evaluation?.period
                                 )}{' '}
                                 · {grade.evaluation?.assignment?.subject?.name}{' '}
                                 · {grade.evaluation?.assignment?.class?.name}
                              </p>
                              <div className="exceptional-grade-components">
                                 <span>
                                    Oral : {grade.components?.oral ?? '—'}
                                 </span>
                                 <span>
                                    Écrit : {grade.components?.written ?? '—'}
                                 </span>
                                 <span>
                                    Composition :{' '}
                                    {grade.components?.composition ?? '—'}
                                 </span>
                              </div>
                              <p className="form-note">
                                 Motif Direction des études :{' '}
                                 {grade.correctionRequestReason}
                                 {grade.requestedBy?.firstName
                                    ? ` · ${grade.requestedBy.firstName} ${grade.requestedBy.lastName}`
                                    : ''}
                              </p>
                              <div className="exceptional-grade-card-footer">
                                 <label className="exceptional-reason-field">
                                    Motif du refus (obligatoire pour refuser)
                                    <input
                                       aria-label={`Motif obligatoire pour ${student?.matricule || 'cet élève'}`}
                                       placeholder="Ex. erreur de saisie ou note justifiée"
                                       value={requestReason}
                                       maxLength="500"
                                       onChange={(event) =>
                                          setEdits((current) => ({
                                             ...current,
                                             [grade._id]: {
                                                ...current[grade._id],
                                                reason: event.target.value,
                                             },
                                          }))
                                       }
                                    />
                                 </label>
                                 <button
                                    className="button button-primary exceptional-save-button"
                                    disabled={busyId === grade._id}
                                    onClick={() => save(grade, 'APPROVED')}>
                                    {busyId === grade._id
                                       ? 'Traitement…'
                                       : 'Autoriser'}
                                 </button>
                                 <button
                                    className="button button-secondary"
                                    disabled={busyId === grade._id}
                                    onClick={() => save(grade, 'REJECTED')}>
                                    Refuser
                                 </button>
                              </div>
                           </article>
                        );
                     })}
                     {!visibleLockedGrades.length && (
                        <div className="exceptional-empty-state">
                           <span aria-hidden="true">⌕</span>
                           <strong>
                              {lockedGrades.length
                                 ? 'Aucun élève trouvé'
                                 : 'Aucune demande en attente'}
                           </strong>
                           <p>
                              {lockedGrades.length
                                 ? 'Vérifiez le matricule saisi ou effacez le filtre.'
                                 : 'Aucune demande de correction de la Direction des études n’attend une décision ADMIN.'}
                           </p>
                        </div>
                     )}
                  </div>
               </section>
            </>
         )}
         {!selected && (
            <div className="exceptional-empty-state">
               <span aria-hidden="true">⌕</span>
               <strong>Aucune demande à traiter</strong>
               <p>Les demandes motivées des enseignants apparaîtront ici.</p>
            </div>
         )}
      </section>
   );
}

function AuditPanel({ token }) {
   const [actors, setActors] = useState([]);
   const [logs, setLogs] = useState([]);
   const [filters, setFilters] = useState({
      actor: '',
      action: '',
      entityType: '',
   });
   const [error, setError] = useState('');
   const [busy, setBusy] = useState(false);

   const loadActors = useCallback(async () => {
      setActors(await apiRequest('/users', { token }));
   }, [token]);

   const loadLogs = useCallback(
      async (filterValues = filters) => {
         setBusy(true);
         setError('');
         try {
            const params = new URLSearchParams({ limit: '100' });
            Object.entries(filterValues).forEach(([key, value]) => {
               if (value.trim()) params.set(key, value.trim());
            });
            setLogs(await apiRequest(`/audit-logs?${params}`, { token }));
         } catch (requestError) {
            setError(requestError.message);
         } finally {
            setBusy(false);
         }
      },
      [filters, token]
   );

   const search = (event) => {
      event.preventDefault();
      loadLogs();
   };

   const resetFilters = () => {
      const emptyFilters = { actor: '', action: '', entityType: '' };
      setFilters(emptyFilters);
      loadLogs(emptyFilters);
   };

   const uniqueActors = new Set(
      logs.map((log) => log.actor?._id).filter(Boolean)
   ).size;
   const lastActivity = logs[0]?.createdAt
      ? new Date(logs[0].createdAt).toLocaleString('fr-FR', {
           dateStyle: 'medium',
           timeStyle: 'short',
        })
      : 'Aucune activité';

   useEffect(() => {
      loadActors().catch((requestError) => setError(requestError.message));
      apiRequest('/audit-logs?limit=100', { token })
         .then(setLogs)
         .catch((requestError) => setError(requestError.message));
   }, [loadActors, token]);

   return (
      <section className="audit-workspace">
         <header className="audit-hero">
            <div>
               <p className="eyebrow">ADMINISTRATION · SÉCURITÉ</p>
               <h2>Journal d’audit</h2>
               <p>
                  Consultez les opérations réalisées dans l’application et leurs
                  détails.
               </p>
            </div>
            <span className="audit-hero-icon" aria-hidden="true">
               ◷
            </span>
         </header>
         {error && <p className="alert alert-error">{error}</p>}
         <div className="audit-overview">
            <div>
               <strong>{logs.length}</strong>
               <span>Événements affichés</span>
            </div>
            <div>
               <strong>{uniqueActors}</strong>
               <span>Utilisateurs concernés</span>
            </div>
            <div>
               <strong>{lastActivity}</strong>
               <span>Activité la plus récente</span>
            </div>
         </div>
         <section className="panel audit-filter-panel">
            <div className="audit-filter-heading">
               <div>
                  <p className="eyebrow">RECHERCHE</p>
                  <h3>Filtrer le journal</h3>
               </div>
               <span>Jusqu’à 100 événements</span>
            </div>
            <form className="audit-filters" onSubmit={search}>
               <label>
                  Utilisateur
                  <select
                     value={filters.actor}
                     onChange={(event) =>
                        setFilters({ ...filters, actor: event.target.value })
                     }>
                     <option value="">Tous les utilisateurs</option>
                     {actors.map((actor) => (
                        <option key={actor._id} value={actor._id}>
                           {actor.firstName} {actor.lastName}
                        </option>
                     ))}
                  </select>
               </label>
               <label>
                  Action
                  <input
                     value={filters.action}
                     onChange={(event) =>
                        setFilters({ ...filters, action: event.target.value })
                     }
                     placeholder="Ex. GRADE_VALIDATED"
                  />
               </label>
               <label>
                  Type d’élément
                  <input
                     value={filters.entityType}
                     onChange={(event) =>
                        setFilters({
                           ...filters,
                           entityType: event.target.value,
                        })
                     }
                     placeholder="Ex. Grade"
                  />
               </label>
               <div className="audit-filter-actions">
                  <button
                     className="button button-secondary"
                     type="button"
                     onClick={resetFilters}
                     disabled={busy}>
                     Réinitialiser
                  </button>
                  <button className="button button-primary" disabled={busy}>
                     {busy ? 'Recherche…' : 'Appliquer les filtres'}
                  </button>
               </div>
            </form>
         </section>
         <section className="panel audit-events-panel">
            <div className="audit-events-heading">
               <div>
                  <p className="eyebrow">HISTORIQUE</p>
                  <h3>Événements</h3>
               </div>
               <span>
                  {busy
                     ? 'Actualisation…'
                     : `${logs.length} résultat${logs.length === 1 ? '' : 's'}`}
               </span>
            </div>
            <div className="audit-event-list">
               {logs.map((log) => {
                  const actorName = log.actor
                     ? `${log.actor.firstName} ${log.actor.lastName}`
                     : 'Compte supprimé';
                  const initials = log.actor
                     ? `${log.actor.firstName?.[0] || ''}${log.actor.lastName?.[0] || ''}`
                     : '—';
                  const details = {
                     anciennesValeurs: log.oldValue,
                     nouvellesValeurs: log.newValue,
                     motif: log.reason,
                  };
                  return (
                     <article className="audit-event" key={log._id}>
                        <span className="audit-event-rail" aria-hidden="true">
                           <i />
                        </span>
                        <div className="audit-event-body">
                           <div className="audit-event-top">
                              <span className="audit-action-label">
                                 {auditActionLabel(log.action)}
                              </span>
                              <time>
                                 {new Date(log.createdAt).toLocaleString(
                                    'fr-FR',
                                    { dateStyle: 'medium', timeStyle: 'short' }
                                 )}
                              </time>
                           </div>
                           <div className="audit-event-meta">
                              <span className="audit-actor-avatar">
                                 {initials}
                              </span>
                              <strong>{actorName}</strong>
                              <span className="audit-event-separator">·</span>
                              <span>
                                 {auditEntityLabel(log.entityType)}{' '}
                                 <small>
                                    #{String(log.entityId).slice(-8)}
                                 </small>
                              </span>
                           </div>
                           <details className="audit-event-details">
                              <summary>Consulter les détails</summary>
                              <pre className="audit-json">
                                 {JSON.stringify(details, null, 2)}
                              </pre>
                           </details>
                        </div>
                     </article>
                  );
               })}
               {!logs.length && (
                  <div className="audit-empty-state">
                     <span aria-hidden="true">⌕</span>
                     <strong>
                        {busy
                           ? 'Recherche en cours…'
                           : 'Aucun événement à afficher'}
                     </strong>
                     <p>
                        Modifiez vos critères ou réinitialisez les filtres pour
                        consulter le journal.
                     </p>
                  </div>
               )}
            </div>
         </section>
      </section>
   );
}

function TeacherWorkspace({
   token,
   assignments = [],
   evaluations = [],
   onRefresh = () => Promise.resolve(),
}) {
   const [selectedClassId, setSelectedClassId] = useState('');
   const [selectedId, setSelectedId] = useState('');
   const [rosterOpen, setRosterOpen] = useState(false);
   const [matriculeFilter, setMatriculeFilter] = useState('');
   const [roster, setRoster] = useState([]);
   const [loadingRoster, setLoadingRoster] = useState(false);
   const [error, setError] = useState('');
   const [notice, setNotice] = useState('');
   const [savingId, setSavingId] = useState('');
   const rosterRequestId = useRef(0);

   const classes = useMemo(() => {
      const grouped = new Map();
      assignments.forEach((assignment) => {
         if (!assignment.class?._id) return;
         const classId = assignment.class._id;
         if (!grouped.has(classId)) {
            grouped.set(classId, {
               _id: classId,
               name: assignment.class.name,
               level: assignment.class.level,
               academicYear: assignment.academicYear,
               assignments: [],
            });
         }
         grouped.get(classId).assignments.push(assignment);
      });
      return [...grouped.values()].sort((first, second) => {
         const left = `${first.name || ''} ${first.level || ''}`;
         const right = `${second.name || ''} ${second.level || ''}`;
         return left.localeCompare(right, 'fr', { sensitivity: 'base' });
      });
   }, [assignments]);

   useEffect(() => {
      if (!classes.length) {
         setSelectedClassId('');
         setSelectedId('');
         setRosterOpen(false);
         setRoster([]);
         return;
      }
      if (
         !selectedClassId ||
         !classes.some((schoolClass) => schoolClass._id === selectedClassId)
      ) {
         setSelectedClassId(classes[0]._id);
      }
   }, [classes, selectedClassId]);

   const selectedClass =
      classes.find((schoolClass) => schoolClass._id === selectedClassId) ||
      null;
   const selectedClassAssignments = selectedClass?.assignments || [];
   const selectedClassAssignmentIds = new Set(
      selectedClassAssignments.map((assignment) => String(assignment._id))
   );
   const classEvaluations = evaluations.filter((evaluation) => {
      const assignmentId =
         typeof evaluation.assignment === 'string'
            ? evaluation.assignment
            : evaluation.assignment?._id;
      return (
         assignmentId && selectedClassAssignmentIds.has(String(assignmentId))
      );
   });
   const assignmentEvaluationMap = new Map(
      selectedClassAssignments.map((assignment) => {
         const assignmentEvaluations = classEvaluations.filter(
            (evaluation) =>
               String(
                  typeof evaluation.assignment === 'string'
                     ? evaluation.assignment
                     : evaluation.assignment?._id
               ) === String(assignment._id)
         );
         return [String(assignment._id), assignmentEvaluations];
      })
   );

   const loadRoster = useCallback(
      async (evaluationId = selectedId) => {
         if (!evaluationId) {
            setRoster([]);
            return;
         }
         const requestId = ++rosterRequestId.current;
         setError('');
         setLoadingRoster(true);
         try {
            const data = await apiRequest(
               `/evaluations/${evaluationId}/roster`,
               { token }
            );
            if (requestId === rosterRequestId.current) setRoster(data);
         } catch (requestError) {
            if (requestId === rosterRequestId.current) {
               setRoster([]);
               setError(requestError.message);
            }
         } finally {
            if (requestId === rosterRequestId.current) setLoadingRoster(false);
         }
      },
      [selectedId, token]
   );

   useEffect(() => {
      if (!selectedClassId) {
         return;
      }

      if (!classEvaluations.length) {
         setSelectedId('');
         setRosterOpen(false);
         setRoster([]);
         return;
      }

      const selectedEvaluationIsValid =
         selectedId &&
         classEvaluations.some(
            (evaluation) => String(evaluation._id) === String(selectedId)
         );

      if (selectedEvaluationIsValid) {
         return;
      }

      const preferredEvaluation = pickPreferredEvaluation(classEvaluations);
      const preferredId = preferredEvaluation
         ? String(preferredEvaluation._id)
         : '';

      if (!preferredId) {
         return;
      }

      setSelectedId(preferredId);
      setRosterOpen(true);
      setMatriculeFilter('');
      setError('');
      setNotice('');
      setRoster([]);
      loadRoster(preferredId);
   }, [classEvaluations, loadRoster, selectedClassId, selectedId]);

   const changeGradeComponent = (enrollmentId, component, rawValue) => {
      setRoster((current) =>
         current.map((row) =>
            row.enrollment === enrollmentId
               ? {
                    ...row,
                    grade: {
                       ...(row.grade || {}),
                       dirty: true,
                       components: {
                          oral: null,
                          written: null,
                          composition: null,
                          ...row.grade?.components,
                          [component]: rawValue,
                       },
                    },
                 }
               : row
         )
      );
   };

   const saveGrade = async (row) => {
      setError('');
      setNotice('');
      const components = Object.fromEntries(
         ['oral', 'written', 'composition'].map((component) => {
            const value = row.grade?.components?.[component];
            return [
               component,
               value === '' || value === null || value === undefined
                  ? null
                  : Number(value),
            ];
         })
      );
      if (
         Object.values(components).some(
            (value) =>
               value !== null &&
               (!Number.isFinite(value) || value < 0 || value > selected.scale)
         )
      ) {
         setError(
            `Chaque note doit être comprise entre 0 et ${selected.scale}.`
         );
         return;
      }
      setSavingId(row.enrollment);
      try {
         await apiRequest(`/evaluations/${selectedId}/grades`, {
            token,
            method: 'POST',
            body: {
               enrollment: row.enrollment,
               components,
            },
         });
         setNotice(
            `Note enregistrée pour ${row.student?.firstName} ${row.student?.lastName}.`
         );
         await loadRoster(selectedId);
         await onRefresh();
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setSavingId('');
      }
   };

   const submitGrades = async () => {
      setError('');
      setNotice('');
      try {
         await apiRequest(`/evaluations/${selectedId}/submit`, {
            token,
            method: 'PATCH',
         });
         setNotice(
            'Les notes renseignées ont été soumises au Directeur des études.'
         );
         await loadRoster(selectedId);
         await onRefresh();
      } catch (requestError) {
         setError(requestError.message);
      }
   };

   const selected =
      classEvaluations.find((item) => item._id === selectedId) || null;
   const completeRoster =
      roster.length > 0 &&
      roster.every((row) =>
         ['oral', 'written', 'composition'].every((component) => {
            const value = row.grade?.components?.[component];
            const score = Number(value);
            return (
               value !== null &&
               value !== '' &&
               value !== undefined &&
               Number.isFinite(score) &&
               score >= 0 &&
               score <= (selected?.scale ?? 0) &&
               !row.grade?.dirty
            );
         })
      );
   const savedGradeCount = roster.filter(
      (row) => row.grade?.status && row.grade.status !== 'NOT_ENTERED'
   ).length;
   const dirtyGradeCount = roster.filter((row) => row.grade?.dirty).length;
   const hasSubmittableGrades = roster.some((row) =>
      ['DRAFT', 'NEEDS_CORRECTION'].includes(row.grade?.status)
   );
   const normalizedMatricule = matriculeFilter.trim().toLocaleUpperCase('fr');
   const visibleRoster = roster.filter(
      (row) =>
         !normalizedMatricule ||
         row.student?.matricule
            ?.toLocaleUpperCase('fr')
            .includes(normalizedMatricule)
   );

   return (
      <section
         id="teacher-workspace"
         className="panel activity-panel teacher-workspace">
         <div className="panel-heading">
            <div>
               <p className="eyebrow">ESPACE DE TRAVAIL</p>
               <h3>Saisie des notes</h3>
               <p className="muted">
                  Choisissez une classe, une matière et une évaluation, puis
                  saisissez les notes des élèves.
               </p>
            </div>
         </div>
         <div className="teacher-workspace-layout">
            <aside className="teacher-class-list">
               <div className="teacher-class-heading">
                  <p className="eyebrow">ÉTAPE 1 · MES CLASSES</p>
                  <span>
                     {classes.length} affectée{classes.length === 1 ? 'e' : 's'}
                  </span>
               </div>
               {classes.length ? (
                  classes.map((schoolClass) => (
                     <button
                        type="button"
                        key={schoolClass._id}
                        className={`evaluation-choice ${selectedClassId === schoolClass._id ? 'evaluation-selected' : ''}`}
                        onClick={() => {
                           setSelectedClassId(schoolClass._id);
                           rosterRequestId.current += 1;
                           setSelectedId('');
                           setRosterOpen(false);
                           setLoadingRoster(false);
                           setRoster([]);
                           setMatriculeFilter('');
                           setError('');
                           setNotice('');
                        }}
                        style={{ textAlign: 'left' }}>
                        <span>
                           <strong>{schoolClass.name}</strong>
                           <small>
                              {schoolClass.level || 'Niveau non renseigné'} ·{' '}
                              {schoolClass.academicYear?.label ||
                                 'Année non renseignée'}{' '}
                              · Ouvrir la classe
                           </small>
                        </span>
                        <span className="status-pill">
                           {schoolClass.assignments.length} mat.
                        </span>
                     </button>
                  ))
               ) : (
                  <p className="muted">
                     Aucune classe ne vous est affectée pour cette année.
                  </p>
               )}
            </aside>

            <div>
               {selectedClass && (
                  <div className="teacher-class-detail">
                     <div className="panel-heading roster-heading">
                        <div>
                           <p className="eyebrow">
                              ÉTAPE 2 · CLASSE SÉLECTIONNÉE
                           </p>
                           <h3>
                              {selectedClass.name} · {selectedClass.level}
                           </h3>
                           <p className="muted">
                              {selectedClass.academicYear?.label ||
                                 'Année non renseignée'}{' '}
                              · {selectedClass.assignments.length} matière
                              {selectedClass.assignments.length > 1 ? 's' : ''}
                           </p>
                        </div>
                     </div>

                     <div className="evaluation-list">
                        {selectedClassAssignments.length ? (
                           selectedClassAssignments.map((assignment) => {
                              const assignmentEvaluations =
                                 assignmentEvaluationMap.get(
                                    String(assignment._id)
                                 ) || [];
                              const activeEvaluation = assignmentEvaluations[0];
                              return (
                                 <button
                                    type="button"
                                    className={`evaluation-choice ${selectedId === activeEvaluation?._id ? 'evaluation-selected' : ''}`}
                                    key={assignment._id}
                                    onClick={() => {
                                       if (!activeEvaluation) {
                                          setError(
                                             'Aucune évaluation n’a encore été créée pour cette matière.'
                                          );
                                          return;
                                       }
                                       setSelectedId(activeEvaluation._id);
                                       setRosterOpen(true);
                                       setMatriculeFilter('');
                                       setError('');
                                       setNotice('');
                                       setRoster([]);
                                       loadRoster(activeEvaluation._id);
                                    }}>
                                    <span>
                                       <strong>
                                          {assignment.subject?.name ||
                                             'Matière non renseignée'}
                                       </strong>
                                       <small>
                                          {activeEvaluation
                                             ? `${activeEvaluation.name} · ${formatEvaluationPeriod(activeEvaluation.period)} · ${formatEvaluationType(activeEvaluation.type)}`
                                             : 'Matière affectée sans évaluation'}
                                       </small>
                                    </span>
                                    <span className="status-pill">
                                       {activeEvaluation
                                          ? `Voir les élèves · ${formatEvaluationStatus(activeEvaluation.status).toLocaleLowerCase('fr')}`
                                          : 'À configurer'}
                                    </span>
                                 </button>
                              );
                           })
                        ) : (
                           <p className="muted teacher-empty-evaluations">
                              Aucune matière n’est affectée à cette classe.
                           </p>
                        )}
                     </div>

                     {!rosterOpen && classEvaluations.length > 0 && (
                        <p className="teacher-roster-prompt">
                           Choisissez une évaluation pour afficher sa liste
                           d’élèves.
                        </p>
                     )}

                     {selected && rosterOpen && (
                        <div>
                           <div className="panel-heading roster-heading">
                              <div>
                                 <p className="eyebrow">
                                    ÉTAPE 3 · BARÈME : {selected.scale}
                                 </p>
                                 <h3>Notes des élèves</h3>
                              </div>
                              <button
                                 className="button button-primary"
                                 disabled={
                                    selected.status !== 'OPEN' ||
                                    !completeRoster ||
                                    !hasSubmittableGrades
                                 }
                                 onClick={submitGrades}>
                                 Soumettre les notes
                              </button>
                           </div>
                           {error && (
                              <p className="alert alert-error">{error}</p>
                           )}
                           {notice && (
                              <p className="alert alert-success">{notice}</p>
                           )}
                           {selected.status !== 'OPEN' && (
                              <p className="alert alert-error">
                                 Cette évaluation est clôturée : les notes sont
                                 consultables, mais ne peuvent plus être saisies
                                 ni modifiées.
                              </p>
                           )}
                           <MatriculeFilter
                              id="teacher-roster-matricule"
                              value={matriculeFilter}
                              onChange={setMatriculeFilter}
                              count={visibleRoster.length}
                              total={roster.length}
                           />
                           <div className="grade-entry-note">
                              Saisissez les trois composantes sur{' '}
                              {selected.scale} puis enregistrez chaque élève.
                              Quand toute la liste est complète, soumettez les
                              notes pour contrôle.
                           </div>
                           <div className="teacher-roster-progress">
                              <div>
                                 <strong>
                                    {savedGradeCount} / {roster.length} notes
                                    enregistrées
                                 </strong>
                                 <span>
                                    {dirtyGradeCount
                                       ? `${dirtyGradeCount} ligne${dirtyGradeCount === 1 ? '' : 's'} à enregistrer`
                                       : 'Chaque élève s’enregistre individuellement'}
                                 </span>
                              </div>
                              <progress
                                 value={savedGradeCount}
                                 max={Math.max(roster.length, 1)}
                                 aria-label={`${savedGradeCount} notes enregistrées sur ${roster.length}`}
                              />
                           </div>
                           {loadingRoster && (
                              <p className="muted">
                                 Chargement de la liste des élèves…
                              </p>
                           )}
                           <div className="table-wrap">
                              <table>
                                 <thead>
                                    <tr>
                                       <th>Matricule</th>
                                       <th>Élève</th>
                                       <th>Oral / {selected.scale}</th>
                                       <th>Écrit / {selected.scale}</th>
                                       <th>Composition / {selected.scale}</th>
                                       <th>Moyenne</th>
                                       <th>État</th>
                                       <th />
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {visibleRoster.map((row) => {
                                       const components =
                                          row.grade?.components || {};
                                       const disabled =
                                          selected.status !== 'OPEN' ||
                                          !isGradeEditable(row.grade);
                                       const componentInput = (
                                          component,
                                          label
                                       ) => (
                                          <input
                                             aria-label={`${label} de ${row.student?.firstName || ''} ${row.student?.lastName || ''}`}
                                             className="score-input grade-component-input"
                                             type="number"
                                             min="0"
                                             max={selected.scale}
                                             step="any"
                                             inputMode="decimal"
                                             value={components[component] ?? ''}
                                             disabled={disabled}
                                             onChange={(event) =>
                                                changeGradeComponent(
                                                   row.enrollment,
                                                   component,
                                                   event.target.value
                                                )
                                             }
                                          />
                                       );
                                       const average = calculateGradeScore(
                                          components,
                                          selected.componentWeights
                                       );
                                       return (
                                          <tr key={row.enrollment}>
                                             <td>{row.student?.matricule}</td>
                                             <td>
                                                {row.student?.firstName}{' '}
                                                {row.student?.lastName}
                                             </td>
                                             <td>
                                                {componentInput(
                                                   'oral',
                                                   'Note orale'
                                                )}
                                             </td>
                                             <td>
                                                {componentInput(
                                                   'written',
                                                   'Note écrite'
                                                )}
                                             </td>
                                             <td>
                                                {componentInput(
                                                   'composition',
                                                   'Note de composition'
                                                )}
                                             </td>
                                             <td>
                                                <strong className="grade-average-preview">
                                                   {average === null
                                                      ? '—'
                                                      : average.toFixed(2)}
                                                </strong>
                                             </td>
                                             <td>
                                                <span
                                                   className={`status-pill ${gradeStatusClass(row.grade?.status)}`}>
                                                   {formatGradeStatus(
                                                      row.grade?.status
                                                   )}
                                                </span>
                                                {row.grade
                                                   ?.correctionReason && (
                                                   <small className="correction-reason">
                                                      {
                                                         row.grade
                                                            .correctionReason
                                                      }
                                                   </small>
                                                )}
                                                {row.grade?.correctionRequest
                                                   ?.status === 'REJECTED' &&
                                                   row.grade.correctionRequest
                                                      .reviewReason && (
                                                      <small className="correction-reason">
                                                         Refus ADMIN :{' '}
                                                         {
                                                            row.grade
                                                               .correctionRequest
                                                               .reviewReason
                                                         }
                                                      </small>
                                                   )}
                                             </td>
                                             <td>
                                                {row.grade?.status ===
                                                'LOCKED' ? (
                                                   <span className="muted">
                                                      Note verrouillée · demande
                                                      via la direction
                                                   </span>
                                                ) : (
                                                   <button
                                                      className="text-button"
                                                      disabled={
                                                         disabled ||
                                                         savingId ===
                                                            row.enrollment
                                                      }
                                                      onClick={() =>
                                                         saveGrade(row)
                                                      }>
                                                      {savingId ===
                                                      row.enrollment
                                                         ? 'Enregistrement…'
                                                         : 'Enregistrer'}
                                                   </button>
                                                )}
                                             </td>
                                          </tr>
                                       );
                                    })}
                                    {!visibleRoster.length && (
                                       <tr>
                                          <td
                                             colSpan="8"
                                             className="empty-cell">
                                             {loadingRoster
                                                ? 'Chargement de la liste…'
                                                : roster.length
                                                  ? 'Aucun élève ne correspond à ce matricule.'
                                                  : 'Aucun élève avec inscription approuvée dans cette classe.'}
                                          </td>
                                       </tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>
      </section>
   );
}

function ClassRosterPanel({ token }) {
   const [classes, setClasses] = useState([]);
   const [selectedClassId, setSelectedClassId] = useState('');
   const [classSearch, setClassSearch] = useState('');
   const [classSort, setClassSort] = useState('name');
   const [classYearFilter, setClassYearFilter] = useState('');
   const [classProgramFilter, setClassProgramFilter] = useState('');
   const [enrollments, setEnrollments] = useState([]);
   const [matriculeFilter, setMatriculeFilter] = useState('');
   const [studentSort, setStudentSort] = useState({
      column: 'matricule',
      direction: 'asc',
   });
   const [loadingClasses, setLoadingClasses] = useState(true);
   const [loadingStudents, setLoadingStudents] = useState(false);
   const [error, setError] = useState('');

   useEffect(() => {
      let active = true;
      apiRequest('/classes', { token })
         .then((data) => {
            if (!active) return;
            setClasses(data);
         })
         .catch((requestError) => {
            if (active) setError(requestError.message);
         })
         .finally(() => {
            if (active) setLoadingClasses(false);
         });
      return () => {
         active = false;
      };
   }, [token]);

   useEffect(() => {
      if (!selectedClassId) {
         setEnrollments([]);
         setLoadingStudents(false);
         return undefined;
      }
      let active = true;
      setLoadingStudents(true);
      setEnrollments([]);
      setError('');
      apiRequest(`/enrollments?class=${encodeURIComponent(selectedClassId)}`, {
         token,
      })
         .then((data) => {
            if (active) setEnrollments(data);
         })
         .catch((requestError) => {
            if (active) setError(requestError.message);
         })
         .finally(() => {
            if (active) setLoadingStudents(false);
         });
      return () => {
         active = false;
      };
   }, [selectedClassId, token]);

   const selectedClass = classes.find((item) => item._id === selectedClassId);
   const normalizedClassSearch = classSearch.trim().toLocaleLowerCase('fr');
   const academicYearOptions = [
      ...new Map(
         classes
            .filter((item) => item.academicYear?._id)
            .map((item) => [item.academicYear._id, item.academicYear])
      ).values(),
   ].sort((first, second) =>
      second.label.localeCompare(first.label, 'fr', { numeric: true })
   );
   const programOptions = [
      ...new Map(
         classes
            .filter((item) => item.program?._id)
            .map((item) => [item.program._id, item.program])
      ).values(),
   ].sort((first, second) =>
      first.name.localeCompare(second.name, 'fr', { sensitivity: 'base' })
   );
   const hasClassFilters = Boolean(
      normalizedClassSearch || classYearFilter || classProgramFilter
   );
   const matchingClasses = classes
      .filter(
         (item) =>
            !classYearFilter || item.academicYear?._id === classYearFilter
      )
      .filter(
         (item) =>
            !classProgramFilter || item.program?._id === classProgramFilter
      )
      .filter(
         (item) =>
            !normalizedClassSearch ||
            [
               item.name,
               item.level,
               item.program?.name,
               item.academicYear?.label,
            ].some((value) =>
               value?.toLocaleLowerCase('fr').includes(normalizedClassSearch)
            )
      )
      .sort((first, second) => {
         const sortValue = (item) =>
            ({
               name: item.name,
               year: item.academicYear?.label,
               program: item.program?.name,
               level: item.level,
            })[classSort] || '';
         return String(sortValue(first)).localeCompare(
            String(sortValue(second)),
            'fr',
            { numeric: true, sensitivity: 'base' }
         );
      });
   const approvedCount = enrollments.filter(
      (item) => item.status === 'APPROVED'
   ).length;
   const pendingCount = enrollments.filter(
      (item) => item.status === 'PENDING'
   ).length;
   const normalizedMatricule = matriculeFilter.trim().toLocaleUpperCase('fr');
   const visibleEnrollments = enrollments
      .filter(
         (item) =>
            !normalizedMatricule ||
            item.student?.matricule
               ?.toLocaleUpperCase('fr')
               .includes(normalizedMatricule)
      )
      .sort((first, second) => {
         const sortValue = (item) =>
            ({
               matricule: item.student?.matricule,
               student: `${item.student?.firstName || ''} ${item.student?.lastName || ''}`,
               contact: item.student?.email || item.student?.phone,
               year: item.academicYear?.label,
               status:
                  {
                     APPROVED: 'Approuvée',
                     PENDING: 'En attente',
                     REJECTED: 'Rejetée',
                  }[item.status] || item.status,
            })[studentSort.column] || '';
         const order = String(sortValue(first)).localeCompare(
            String(sortValue(second)),
            'fr',
            { numeric: true, sensitivity: 'base' }
         );
         return studentSort.direction === 'asc' ? order : -order;
      });
   const toggleStudentSort = (column) =>
      setStudentSort((current) => ({
         column,
         direction:
            current.column === column && current.direction === 'asc'
               ? 'desc'
               : 'asc',
      }));

   return (
      <>
         <section className="class-page-hero">
            <div className="class-page-hero-copy">
               <p className="eyebrow">ESPACE SCOLAIRE</p>
               <h2>Classes et élèves</h2>
               <p>
                  Retrouvez les élèves et suivez leurs dossiers, classe par
                  classe.
               </p>
            </div>
            <div className="class-page-count">
               <span className="class-page-count-icon" aria-hidden="true">
                  ▦
               </span>
               <span>
                  <strong>{classes.length}</strong>
                  <small>
                     classe{classes.length === 1 ? '' : 's'} au total
                  </small>
               </span>
            </div>
         </section>
         {error && <p className="alert alert-error">{error}</p>}
         <section className="panel class-roster-panel">
            <div
               className={
                  selectedClass
                     ? 'class-roster-toolbar class-roster-toolbar-hidden'
                     : 'class-roster-toolbar'
               }>
               <div className="class-finder-heading">
                  <span className="eyebrow">PARCOURIR</span>
                  <strong>Retrouver une classe</strong>
                  <small>
                     {matchingClasses.length} résultat
                     {matchingClasses.length === 1 ? '' : 's'} sur{' '}
                     {classes.length}
                  </small>
                  {hasClassFilters && (
                     <button
                        type="button"
                        className="class-clear-filters"
                        onClick={() => {
                           setClassSearch('');
                           setClassYearFilter('');
                           setClassProgramFilter('');
                        }}>
                        Effacer les filtres
                     </button>
                  )}
               </div>
               <div className="class-finder-controls">
                  <label className="class-finder-search">
                     Recherche par mot-clé
                     <input
                        type="search"
                        value={classSearch}
                        onChange={(event) => setClassSearch(event.target.value)}
                        placeholder="Classe, niveau, programme…"
                     />
                  </label>
                  <label>
                     Année scolaire
                     <select
                        value={classYearFilter}
                        onChange={(event) =>
                           setClassYearFilter(event.target.value)
                        }>
                        <option value="">Toutes les années</option>
                        {academicYearOptions.map((year) => (
                           <option key={year._id} value={year._id}>
                              {year.label}
                           </option>
                        ))}
                     </select>
                  </label>
                  <label>
                     Programme
                     <select
                        value={classProgramFilter}
                        onChange={(event) =>
                           setClassProgramFilter(event.target.value)
                        }>
                        <option value="">Tous les programmes</option>
                        {programOptions.map((program) => (
                           <option key={program._id} value={program._id}>
                              {program.name}
                           </option>
                        ))}
                     </select>
                  </label>
                  <label className="class-finder-sort">
                     Trier par
                     <select
                        value={classSort}
                        onChange={(event) => setClassSort(event.target.value)}>
                        <option value="name">Nom de classe</option>
                        <option value="year">Année scolaire</option>
                        <option value="program">Programme</option>
                        <option value="level">Niveau</option>
                     </select>
                  </label>
               </div>
            </div>
            {!selectedClass && !loadingClasses && classes.length > 0 && (
               <div className="class-catalogue-grid">
                  {matchingClasses.map((item) => (
                     <button
                        type="button"
                        className="class-catalogue-card"
                        key={item._id}
                        onClick={() => {
                           setSelectedClassId(item._id);
                           setMatriculeFilter('');
                        }}>
                        <span className="class-catalogue-card-top">
                           <span className="class-catalogue-level">
                              {item.level || 'Niveau non défini'}
                           </span>
                           <span
                              className={`status-pill ${item.isActive ? 'status-active' : 'status-muted'}`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                           </span>
                        </span>
                        <strong className="class-catalogue-name">
                           {item.name}
                        </strong>
                        <span className="class-catalogue-program">
                           {item.program?.name || 'Programme non renseigné'}
                        </span>
                        <span className="class-catalogue-year">
                           {item.academicYear?.label || 'Année non renseignée'}
                        </span>
                        <span className="class-catalogue-open">
                           Consulter les élèves{' '}
                           <span aria-hidden="true">→</span>
                        </span>
                     </button>
                  ))}
                  {!matchingClasses.length && (
                     <div className="class-empty-state class-catalogue-empty">
                        <span aria-hidden="true">⌕</span>
                        <h3>Aucune classe trouvée</h3>
                        <p>
                           Modifiez votre recherche ou choisissez un autre tri.
                        </p>
                     </div>
                  )}
               </div>
            )}
            {loadingClasses && (
               <div className="class-list-loading">
                  <span /> Chargement des classes…
               </div>
            )}
            {selectedClass && (
               <>
                  <button
                     type="button"
                     className="class-back-button"
                     onClick={() => {
                        setSelectedClassId('');
                        setMatriculeFilter('');
                     }}>
                     ← Toutes les classes
                  </button>
                  <div className="class-summary">
                     <div className="class-summary-title">
                        <span className="class-summary-mark" aria-hidden="true">
                           ▦
                        </span>
                        <div>
                           <span className="eyebrow">CLASSE SÉLECTIONNÉE</span>
                           <h3>
                              {selectedClass.name}{' '}
                              <span>· {selectedClass.level}</span>
                           </h3>
                           <p>
                              {selectedClass.program?.name ||
                                 'Programme non renseigné'}{' '}
                              <i>·</i>{' '}
                              {selectedClass.academicYear?.label ||
                                 'Année non renseignée'}
                           </p>
                        </div>
                     </div>
                     <div className="class-summary-stats">
                        <div className="class-stat-card">
                           <strong>{approvedCount}</strong>
                           <span>Élèves approuvés</span>
                        </div>
                        <div className="class-stat-card">
                           <strong>{pendingCount}</strong>
                           <span>Dossiers en attente</span>
                        </div>
                        <div className="class-stat-card">
                           <strong>{selectedClass.capacity ?? '—'}</strong>
                           <span>
                              Capacité ·{' '}
                              {selectedClass.isActive ? 'Active' : 'Inactive'}
                           </span>
                        </div>
                     </div>
                  </div>
                  <div className="panel-heading roster-heading">
                     <div>
                        <p className="eyebrow">ANNUAIRE DE CLASSE</p>
                        <h3>
                           Élèves inscrits{' '}
                           <span className="class-roster-count">
                              {loadingStudents
                                 ? '…'
                                 : visibleEnrollments.length}
                           </span>
                        </h3>
                        <p className="class-list-caption">
                           Recherchez par matricule ou triez avec les en-têtes.
                        </p>
                     </div>
                     {loadingStudents && (
                        <span className="class-loading">
                           <span /> Chargement…
                        </span>
                     )}
                  </div>
                  <MatriculeFilter
                     id="class-roster-matricule"
                     value={matriculeFilter}
                     onChange={setMatriculeFilter}
                     count={visibleEnrollments.length}
                     total={enrollments.length}
                  />
                  <div className="table-wrap">
                     <table>
                        <thead>
                           <tr>
                              <SortableHeader
                                 label="Matricule"
                                 column="matricule"
                                 sort={studentSort}
                                 onSort={toggleStudentSort}
                              />
                              <SortableHeader
                                 label="Élève"
                                 column="student"
                                 sort={studentSort}
                                 onSort={toggleStudentSort}
                              />
                              <SortableHeader
                                 label="Contact"
                                 column="contact"
                                 sort={studentSort}
                                 onSort={toggleStudentSort}
                              />
                              <SortableHeader
                                 label="Année"
                                 column="year"
                                 sort={studentSort}
                                 onSort={toggleStudentSort}
                              />
                              <SortableHeader
                                 label="Statut"
                                 column="status"
                                 sort={studentSort}
                                 onSort={toggleStudentSort}
                              />
                           </tr>
                        </thead>
                        <tbody>
                           {visibleEnrollments.map((item) => (
                              <tr key={item._id}>
                                 <td>{item.student?.matricule || '—'}</td>
                                 <td>
                                    {item.student
                                       ? `${item.student.firstName} ${item.student.lastName}`
                                       : 'Élève indisponible'}
                                 </td>
                                 <td>
                                    {item.student?.email ||
                                       item.student?.phone ||
                                       '—'}
                                 </td>
                                 <td>{item.academicYear?.label || '—'}</td>
                                 <td>
                                    <span
                                       className={`status-pill ${item.status === 'APPROVED' ? 'status-active' : item.status === 'REJECTED' ? 'status-muted' : 'status-pending'}`}>
                                       {item.status === 'APPROVED'
                                          ? 'Approuvée'
                                          : item.status === 'REJECTED'
                                            ? 'Rejetée'
                                            : 'En attente'}
                                    </span>
                                 </td>
                              </tr>
                           ))}
                           {!loadingStudents && !visibleEnrollments.length && (
                              <tr>
                                 <td colSpan="5" className="empty-cell">
                                    {enrollments.length
                                       ? 'Aucun élève ne correspond à ce matricule.'
                                       : 'Aucun dossier d’élève n’est associé à cette classe.'}
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </>
            )}
            {!classes.length && !loadingClasses && (
               <div className="class-empty-state">
                  <span aria-hidden="true">▦</span>
                  <h3>Aucune classe à afficher</h3>
                  <p>
                     Les classes disponibles apparaîtront ici après leur
                     création.
                  </p>
               </div>
            )}
         </section>
      </>
   );
}

function EnrollmentHeadcountPanel({ token }) {
   const [enrollments, setEnrollments] = useState([]);
   const [selectedYearId, setSelectedYearId] = useState('');
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');

   useEffect(() => {
      let active = true;
      apiRequest('/enrollments?status=APPROVED', { token })
         .then((data) => {
            if (!active) return;
            setEnrollments(data);
            const years = [
               ...new Map(
                  data
                     .filter((item) => item.academicYear?._id)
                     .map((item) => [item.academicYear._id, item.academicYear])
               ).values(),
            ].sort((first, second) =>
               String(second.label || '').localeCompare(
                  String(first.label || ''),
                  'fr',
                  { numeric: true }
               )
            );
            const activeYear = years.find((year) => year.status === 'ACTIVE');
            setSelectedYearId(
               (current) => current || activeYear?._id || years[0]?._id || ''
            );
         })
         .catch((requestError) => {
            if (active) setError(requestError.message);
         })
         .finally(() => {
            if (active) setLoading(false);
         });
      return () => {
         active = false;
      };
   }, [token]);

   const years = [
      ...new Map(
         enrollments
            .filter((item) => item.academicYear?._id)
            .map((item) => [item.academicYear._id, item.academicYear])
      ).values(),
   ].sort((first, second) =>
      String(second.label || '').localeCompare(
         String(first.label || ''),
         'fr',
         { numeric: true }
      )
   );
   const yearEnrollments = enrollments.filter(
      (item) => !selectedYearId || item.academicYear?._id === selectedYearId
   );
   const countStudents = (items) =>
      new Set(items.map((item) => item.student?._id).filter(Boolean)).size;
   const groupStudents = (items, keyFor, detailsFor) => {
      const groups = new Map();
      items.forEach((item) => {
         const key = keyFor(item);
         const studentId = item.student?._id;
         if (!key || !studentId) return;
         if (!groups.has(key))
            groups.set(key, { ...detailsFor(item), students: new Set() });
         groups.get(key).students.add(studentId);
      });
      return [...groups.values()]
         .map((group) => ({ ...group, count: group.students.size }))
         .sort(
            (first, second) =>
               second.count - first.count ||
               first.name.localeCompare(second.name, 'fr', {
                  sensitivity: 'base',
               })
         );
   };
   const programGroups = groupStudents(
      yearEnrollments,
      (item) => item.program?._id,
      (item) => ({
         id: item.program._id,
         name: item.program?.name || 'Programme sans nom',
      })
   );
   const classGroups = groupStudents(
      yearEnrollments,
      (item) => item.class?._id,
      (item) => ({
         id: item.class._id,
         name: item.class?.name || 'Classe sans nom',
         level: item.class?.level,
         programName: item.program?.name || 'Programme non renseigné',
      })
   );
   const totalStudents = countStudents(yearEnrollments);
   const largestProgramGroup = Math.max(
      1,
      ...programGroups.map((group) => group.count)
   );
   const largestClassGroup = Math.max(
      1,
      ...classGroups.map((group) => group.count)
   );

   return (
      <section className="headcount-workspace">
         <header className="headcount-hero">
            <div>
               <p className="eyebrow">SUIVI DES EFFECTIFS</p>
               <h2>Effectif de l’établissement</h2>
               <p>
                  Élèves ayant une inscription approuvée, répartis par programme
                  et par classe.
               </p>
            </div>
            <label>
               Année scolaire
               <select
                  value={selectedYearId}
                  onChange={(event) => setSelectedYearId(event.target.value)}
                  disabled={loading}>
                  <option value="">Toutes les années</option>
                  {years.map((year) => (
                     <option key={year._id} value={year._id}>
                        {year.label}
                        {year.status === 'ACTIVE' ? ' · En cours' : ''}
                     </option>
                  ))}
               </select>
            </label>
         </header>
         {error && <p className="alert alert-error">{error}</p>}
         <section className="headcount-total panel">
            <div>
               <p className="eyebrow">
                  EFFECTIF TOTAL{' '}
                  {years.find((year) => year._id === selectedYearId)?.label
                     ? `· ${years.find((year) => year._id === selectedYearId).label}`
                     : '· TOUTES LES ANNÉES'}
               </p>
               <strong>{loading ? '…' : totalStudents}</strong>
               <span>
                  élève{totalStudents === 1 ? '' : 's'} inscrit
                  {totalStudents === 1 ? '' : 's'}
               </span>
            </div>
            <span className="headcount-total-icon" aria-hidden="true">
               ▥
            </span>
         </section>
         <div className="headcount-columns">
            <section className="panel headcount-list-panel">
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">RÉPARTITION</p>
                     <h3>Par programme</h3>
                  </div>
                  <span className="headcount-count">
                     {programGroups.length}
                  </span>
               </div>
               {loading ? (
                  <p className="headcount-empty">Chargement des effectifs…</p>
               ) : programGroups.length ? (
                  <div className="headcount-list">
                     {programGroups.map((group) => (
                        <div className="headcount-row" key={group.id}>
                           <div className="headcount-row-label">
                              <strong>{group.name}</strong>
                              <span>
                                 {group.count} élève
                                 {group.count === 1 ? '' : 's'}
                              </span>
                           </div>
                           <div className="headcount-bar">
                              <span
                                 style={{
                                    width: `${Math.max(5, (group.count / largestProgramGroup) * 100)}%`,
                                 }}
                              />
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <p className="headcount-empty">
                     Aucune inscription approuvée pour cette année.
                  </p>
               )}
            </section>
            <section className="panel headcount-list-panel">
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">RÉPARTITION</p>
                     <h3>Par classe</h3>
                  </div>
                  <span className="headcount-count">{classGroups.length}</span>
               </div>
               {loading ? (
                  <p className="headcount-empty">Chargement des effectifs…</p>
               ) : classGroups.length ? (
                  <div className="headcount-list">
                     {classGroups.map((group) => (
                        <div className="headcount-row" key={group.id}>
                           <div className="headcount-row-label">
                              <strong>
                                 {group.name}
                                 {group.level ? ` · ${group.level}` : ''}
                              </strong>
                              <span>
                                 {group.programName} · {group.count} élève
                                 {group.count === 1 ? '' : 's'}
                              </span>
                           </div>
                           <div className="headcount-bar">
                              <span
                                 style={{
                                    width: `${Math.max(5, (group.count / largestClassGroup) * 100)}%`,
                                 }}
                              />
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <p className="headcount-empty">
                     Aucune classe avec des inscriptions approuvées.
                  </p>
               )}
            </section>
         </div>
      </section>
   );
}

const ROLE_GUIDES = {
   ADMIN: {
      label: 'Administrateur général',
      intro: 'Préparez le cadre scolaire, ouvrez les accès, puis suivez les dossiers et les opérations dans l’ordre.',
      steps: [
         {
            title: 'Préparer les référentiels',
            text: 'Dans Paramétrage, créez ou activez d’abord l’année scolaire, les programmes et les classes. La Direction des études pourra ensuite configurer les matières et les barèmes.',
            panel: 'setup',
            action: 'Ouvrir le paramétrage',
         },
         {
            title: 'Créer les comptes du personnel',
            text: 'Dans Utilisateurs, créez les comptes nécessaires et attribuez à chacun le rôle correspondant à ses responsabilités.',
            panel: 'users',
            action: 'Gérer les comptes',
         },
         {
            title: 'Traiter les inscriptions',
            text: 'Consultez les dossiers soumis, vérifiez les informations, puis approuvez-les ou rejetez-les avec un motif. Les élèves approuvés pourront apparaître dans les classes et les évaluations.',
            panel: 'enrollments',
            action: 'Traiter les dossiers',
         },
         {
            title: 'Vérifier les classes et les effectifs',
            text: 'Après le traitement des dossiers, consultez la liste des élèves par classe et leur statut d’inscription.',
            panel: 'classes',
            action: 'Parcourir les classes',
         },
         {
            title: 'Consulter les effectifs',
            text: 'Contrôlez le nombre d’élèves inscrits et leur répartition par programme et par classe.',
            panel: 'headcount',
            action: 'Voir les effectifs',
         },
         {
            title: 'Traiter les demandes de correction',
            text: 'Lorsque la Direction des études demande la réouverture d’une note verrouillée, examinez la demande et autorisez-la ou refusez-la.',
            panel: 'exceptions',
            action: 'Examiner les demandes',
         },
         {
            title: 'Consulter les résultats et les bulletins',
            text: 'Consultez les résultats par classe après leur validation par la Direction des études.',
            panel: 'results',
            action: 'Consulter les résultats',
         },
         {
            title: 'Rechercher un bulletin',
            text: 'Lorsque les résultats sont définitifs, recherchez le bulletin de l’élève concerné et utilisez son option d’impression.',
            panel: 'documents',
            action: 'Ouvrir les bulletins',
         },
         {
            title: 'Vérifier les opérations sensibles',
            text: 'Utilisez le journal d’audit pour retrouver les changements importants et les décisions prises dans l’application.',
            panel: 'audit',
            action: 'Ouvrir le journal',
         },
      ],
      tips: [
         'Respectez l’ordre année scolaire → programmes → classes avant de traiter les inscriptions.',
         'Attribuez uniquement le rôle nécessaire à chaque compte et transmettez les accès de façon sécurisée.',
         'Une année clôturée reste consultable, mais ses données ne peuvent plus être modifiées.',
      ],
   },
   DIRECTEUR_ETUDES: {
      label: 'Direction des études',
      intro: 'Préparez l’organisation pédagogique, puis suivez le cycle complet des notes jusqu’aux résultats définitifs.',
      steps: [
         {
            title: 'Vérifier l’année, les programmes et les classes',
            text: 'Avant de configurer les matières, confirmez que l’année scolaire, les programmes et les classes ont été créés et activés dans Paramétrage.',
            panel: 'setup',
            action: 'Vérifier le paramétrage',
         },
         {
            title: 'Définir les règles générales de calcul',
            text: 'Définissez une seule fois le barème, le seuil et la méthode de calcul communs à toutes les classes, tous les programmes et tous les niveaux.',
            panel: 'pedagogy',
            studyView: 'settings',
            action: 'Définir le barème commun',
         },
         {
            title: 'Créer les matières et leurs paramètres',
            text: 'À la création, renseignez l’année, le programme, le niveau, le coefficient et les règles de calcul. Le même barème général s’applique à toutes les matières.',
            panel: 'pedagogy',
            studyView: 'subjects',
            action: 'Créer les matières',
         },
         {
            title: 'Créer les comptes enseignants',
            text: 'Créez les comptes des enseignants avant de les affecter. Vérifiez leur adresse e-mail pour distinguer les homonymes.',
            panel: 'pedagogy',
            studyView: 'evaluations',
            action: 'Gérer les enseignants',
         },
         {
            title: 'Créer les affectations',
            text: 'Associez chaque enseignant à l’année, au programme, à la classe et à une matière. Créez les affectations nécessaires pour ses autres matières ou classes.',
            panel: 'pedagogy',
            studyView: 'evaluations',
            action: 'Gérer les affectations',
         },
         {
            title: 'Créer et suivre les évaluations',
            text: 'Créez les évaluations à partir des affectations, puis suivez leur état. Clôturez une évaluation lorsqu’elle ne doit plus recevoir de notes.',
            panel: 'pedagogy',
            studyView: 'evaluations',
            action: 'Gérer les évaluations',
         },
         {
            title: 'Contrôler les notes soumises',
            text: 'Ouvrez Notes à contrôler, vérifiez les notes, puis validez-les ou retournez-les à l’enseignant avec un motif. Une note validée peut être verrouillée.',
            panel: 'pedagogy',
            studyView: 'grades',
            action: 'Ouvrir les notes à contrôler',
         },
         {
            title: 'Finaliser les résultats',
            text: 'Après avoir vérifié que toutes les notes requises sont traitées, validez et verrouillez les résultats pour l’année ou la classe concernée.',
            panel: 'results',
            action: 'Finaliser les résultats',
         },
         {
            title: 'Consulter les bulletins',
            text: 'Une fois les résultats définitifs disponibles, recherchez et consultez les bulletins des élèves.',
            panel: 'documents',
            action: 'Ouvrir les bulletins',
         },
         {
            title: 'Consulter les classes',
            text: 'Vérifiez les élèves inscrits dans les classes lorsque vous contrôlez une affectation ou une évaluation.',
            panel: 'classes',
            action: 'Parcourir les classes',
         },
         {
            title: 'Consulter les effectifs',
            text: 'Consultez la répartition des élèves par programme et par classe.',
            panel: 'headcount',
            action: 'Voir les effectifs',
         },
      ],
      tips: [
         'Vérifiez les coefficients et le barème avant de créer les évaluations.',
         'Seuls les élèves avec une inscription approuvée sont disponibles dans une classe.',
         'Une évaluation clôturée ne peut plus recevoir de notes ; les résultats définitifs ne peuvent pas être modifiés.',
      ],
   },
   DIRECTEUR_SCOLARITE: {
      label: 'Direction de la scolarité',
      intro: 'Vérifiez les référentiels disponibles, créez les dossiers d’élèves et suivez leur validation dans l’ordre.',
      steps: [
         {
            title: 'Vérifier les informations scolaires',
            text: 'Avant de créer un dossier, confirmez auprès de la Direction des études que l’année, le programme et la classe concernés sont disponibles.',
            panel: 'enrollments',
            action: 'Ouvrir les inscriptions',
         },
         {
            title: 'Enregistrer l’élève',
            text: 'Dans Inscriptions, créez son dossier personnel en renseignant soigneusement le matricule et les informations demandées.',
            panel: 'enrollments',
            action: 'Enregistrer un élève',
         },
         {
            title: 'Créer et soumettre son inscription',
            text: 'Sélectionnez l’élève, l’année scolaire, le programme et la classe. Vérifiez les informations puis soumettez le dossier à l’approbation.',
            panel: 'enrollments',
            action: 'Créer une inscription',
         },
         {
            title: 'Suivre la décision',
            text: 'Consultez l’état du dossier. Si l’inscription est rejetée, lisez le motif, corrigez les informations concernées et soumettez-la de nouveau.',
            panel: 'enrollments',
            action: 'Suivre les dossiers',
         },
         {
            title: 'Vérifier les classes et les effectifs',
            text: 'Une fois les inscriptions approuvées, consultez la liste des élèves de chaque classe et leur statut.',
            panel: 'classes',
            action: 'Parcourir les classes',
         },
         {
            title: 'Consulter les effectifs',
            text: 'Contrôlez le nombre d’élèves inscrits et leur répartition par programme et par classe.',
            panel: 'headcount',
            action: 'Voir les effectifs',
         },
      ],
      tips: [
         'Vérifiez le matricule et l’année avant de créer l’inscription.',
         'Un élève ne peut avoir qu’une inscription par année scolaire.',
         'Un dossier en attente ou rejeté ne donne pas accès aux évaluations de la classe.',
      ],
   },
   ENSEIGNANT: {
      label: 'Enseignant',
      intro: 'Suivez ce parcours pour vérifier vos affectations, saisir les notes et les transmettre au contrôle.',
      steps: [
         {
            title: 'Vérifier vos affectations',
            text: 'Depuis votre tableau de bord, vérifiez les années, classes et matières qui vous sont confiées. Si une affectation manque, contactez la Direction des études.',
            panel: 'overview',
            action: 'Revenir à mon tableau de bord',
         },
         {
            title: 'Choisir une évaluation ouverte',
            text: 'Dans votre espace de travail, sélectionnez la classe, la matière et l’évaluation à traiter. Une évaluation clôturée ne peut plus être modifiée.',
            panel: 'overview',
            action: 'Ouvrir mon espace de travail',
         },
         {
            title: 'Vérifier la liste puis saisir les notes',
            text: 'La liste comprend les élèves dont l’inscription est approuvée. Respectez le barème affiché et enregistrez chaque note.',
            panel: 'overview',
            action: 'Revenir à la saisie',
         },
         {
            title: 'Soumettre l’évaluation',
            text: 'Lorsque la saisie est terminée, soumettez les notes au contrôle de la Direction des études. Vérifiez le statut après l’envoi.',
            panel: 'overview',
            action: 'Revenir à mon espace',
         },
         {
            title: 'Traiter les retours de contrôle',
            text: 'Si une note vous est retournée, lisez le motif, corrigez-la et soumettez-la de nouveau. Pour une note verrouillée, contactez la Direction des études.',
            panel: 'overview',
            action: 'Consulter mon espace de travail',
         },
      ],
      tips: [
         'Enregistrez les notes avant de soumettre l’évaluation.',
         'Seuls les élèves dont l’inscription est approuvée figurent dans la liste.',
         'Une évaluation clôturée ou une note verrouillée ne peut pas être modifiée depuis votre espace.',
      ],
   },
   ELEVE: {
      label: 'Élève',
      intro: 'Retrouvez votre dossier, consultez les résultats par module et imprimez un relevé lorsque nécessaire.',
      steps: [
         {
            title: 'Vérifier votre dossier',
            text: 'Depuis le tableau de bord, vérifiez votre matricule, vos inscriptions et les classes associées.',
            panel: 'overview',
            action: 'Ouvrir mon tableau de bord',
         },
         {
            title: 'Ouvrir vos résultats',
            text: 'Accédez à vos relevés disponibles et choisissez l’année ou l’inscription que vous souhaitez consulter.',
            panel: 'overview',
            action: 'Revenir à mes résultats',
         },
         {
            title: 'Choisir le module et lire les notes',
            text: 'Consultez d’abord la moyenne générale et les moyennes par module, puis sélectionnez Module 1 ou Module 2 pour lire les résultats matière par matière.',
            panel: 'overview',
            action: 'Consulter mon relevé',
         },
         {
            title: 'Vérifier le statut puis imprimer',
            text: 'Un relevé provisoire peut signaler des notes manquantes ou en attente de validation. Utilisez le bouton d’impression du relevé lorsque vous souhaitez le conserver.',
            panel: 'overview',
            action: 'Revenir à mes relevés',
         },
      ],
      tips: [
         'Gardez votre matricule pour toute demande auprès de la scolarité.',
         'Si une inscription ou un résultat manque, adressez-vous à la scolarité de votre établissement.',
         'Le relevé imprimé indique s’il est provisoire ou définitif.',
      ],
   },
};

function UserGuidePanel({ role, dashboard, onNavigate }) {
   const guide = ROLE_GUIDES[role];
   if (!guide) return null;

   let currentContext = '';
   if (role === 'ADMIN') {
      const pending = dashboard.enrollments?.pending || 0;
      currentContext = pending
         ? `${pending} inscription${pending === 1 ? '' : 's'} en attente de votre décision.`
         : 'Aucune inscription n’attend actuellement votre décision.';
   } else if (role === 'DIRECTEUR_ETUDES') {
      const submitted = dashboard.gradeStatuses?.SUBMITTED || 0;
      currentContext = submitted
         ? `${submitted} note${submitted === 1 ? '' : 's'} soumise${submitted === 1 ? '' : 's'} à contrôler.`
         : 'Aucune note soumise n’attend actuellement votre contrôle.';
   } else if (role === 'DIRECTEUR_SCOLARITE') {
      const pending = dashboard.enrollmentStatuses?.pending || 0;
      const rejected = dashboard.enrollmentStatuses?.rejected || 0;
      currentContext = `${pending} dossier${pending === 1 ? '' : 's'} en attente · ${rejected} correction${rejected === 1 ? '' : 's'} à reprendre.`;
   } else if (role === 'ENSEIGNANT') {
      const evaluationCount = dashboard.evaluations?.length || 0;
      currentContext = evaluationCount
         ? `${evaluationCount} évaluation${evaluationCount === 1 ? '' : 's'} disponible${evaluationCount === 1 ? '' : 's'} dans votre espace.`
         : 'Aucune évaluation disponible pour le moment. Vérifiez vos affectations ou contactez la direction des études.';
   } else {
      const results = dashboard.results || [];
      const provisional = results.filter(
         (result) => result.status === 'PROVISIONAL'
      ).length;
      currentContext = results.length
         ? `${results.length} relevé${results.length === 1 ? '' : 's'} disponible${results.length === 1 ? '' : 's'} · ${provisional} provisoire${provisional === 1 ? '' : 's'}.`
         : 'Aucun relevé n’est disponible pour le moment.';
   }

   return (
      <section className="guide-page">
         <div className="guide-hero">
            <div className="guide-hero-copy">
               <p className="eyebrow">GUIDE PERSONNALISÉ</p>
               <span className="guide-role-tag">{guide.label}</span>
               <h2>Bienvenue dans votre guide</h2>
               <p>{guide.intro}</p>
            </div>
            <div className="guide-context">
               <span className="guide-context-icon">✦</span>
               <div>
                  <strong>Votre situation</strong>
                  <p>{currentContext}</p>
               </div>
            </div>
         </div>
         <div className="panel guide-access-note">
            <strong>Avant de commencer</strong>
            <p>
               Connectez-vous avec votre compte. Si vous utilisez un mot de
               passe provisoire, remplacez-le lors de la première connexion
               avant de suivre les étapes ci-dessous.
            </p>
         </div>
         <div className="guide-layout">
            <section className="panel guide-steps-panel">
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">PARCOURS CONSEILLÉ</p>
                     <h3>Comment utiliser votre espace</h3>
                  </div>
                  <span className="guide-step-count">
                     {guide.steps.length} étapes
                  </span>
               </div>
               <div className="guide-steps">
                  {guide.steps.map((step, index) => (
                     <article className="guide-step" key={step.title}>
                        <span className="guide-step-number">
                           {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="guide-step-content">
                           <h4>{step.title}</h4>
                           <p>{step.text}</p>
                           <button
                              className="guide-link"
                              onClick={() =>
                                 onNavigate(step.panel, step.studyView)
                              }>
                              {step.action}
                              <span aria-hidden="true"> →</span>
                           </button>
                        </div>
                     </article>
                  ))}
               </div>
            </section>
            <aside className="panel guide-tips-panel">
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">À GARDER EN TÊTE</p>
                     <h3>Conseils utiles</h3>
                  </div>
               </div>
               <ul>
                  {guide.tips.map((tip) => (
                     <li key={tip}>
                        <span aria-hidden="true">✓</span>
                        {tip}
                     </li>
                  ))}
               </ul>
               <div className="guide-help-card">
                  <span>Besoin d’aide ?</span>
                  <p>
                     Contactez le responsable de votre service en précisant
                     votre rôle et l’écran concerné.
                  </p>
               </div>
            </aside>
         </div>
      </section>
   );
}

function AdminSetupPanel({ token, role }) {
   const [years, setYears] = useState([]);
   const [programs, setPrograms] = useState([]);
   const [classes, setClasses] = useState([]);
   const [yearForm, setYearForm] = useState({
      label: '',
      startDate: '',
      endDate: '',
   });
   const [programForm, setProgramForm] = useState({
      name: '',
      code: '',
      description: '',
   });
   const [classForm, setClassForm] = useState({
      name: '',
      level: '',
      academicYear: '',
      program: '',
      capacity: 50,
   });
   const [activeForm, setActiveForm] = useState('');
   const [activeCatalog, setActiveCatalog] = useState(
      role === 'ADMIN' ? 'years' : 'programs'
   );
   const [error, setError] = useState('');
   const [notice, setNotice] = useState('');
   const [busy, setBusy] = useState(false);

   const refresh = useCallback(async () => {
      const [yearData, programData, classData] = await Promise.all([
         apiRequest('/academic-years', { token }),
         apiRequest('/programs', { token }),
         apiRequest('/classes', { token }),
      ]);
      setYears(yearData);
      setPrograms(programData);
      setClasses(classData);
   }, [token]);

   useEffect(() => {
      refresh().catch((requestError) => setError(requestError.message));
   }, [refresh]);

   const run = async (request, success) => {
      setBusy(true);
      setError('');
      setNotice('');
      try {
         await request();
         setNotice(success);
         await refresh();
         setActiveForm('');
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   const availablePrograms = programs.filter((program) => program.isActive);

   return (
      <section className="studies-workspace">
         {error && !activeForm && <p className="alert alert-error">{error}</p>}
         {notice && <p className="alert alert-success">{notice}</p>}
         <div className="panel action-launcher">
            <div>
               <p className="eyebrow">PARAMÉTRAGE</p>
               <h3>Gérer les référentiels scolaires</h3>
            </div>
            <div className="launcher-actions">
               {role === 'ADMIN' && (
                  <button
                     className="button button-secondary"
                     onClick={() => {
                        setActiveCatalog('years');
                        setActiveForm('year');
                     }}>
                     Nouvelle année
                  </button>
               )}
               <button
                  className="button button-secondary"
                  onClick={() => {
                     setActiveCatalog('programs');
                     setActiveForm('program');
                  }}>
                  Nouveau programme
               </button>
               <button
                  className="button button-primary"
                  onClick={() => {
                     setActiveCatalog('classes');
                     setActiveForm('class');
                  }}>
                  Nouvelle classe
               </button>
            </div>
         </div>
         {activeForm && (
            <ModalDialog
               eyebrow="PARAMÉTRAGE SCOLAIRE"
               title={
                  activeForm === 'year'
                     ? 'Créer une année scolaire'
                     : activeForm === 'program'
                       ? 'Créer un programme'
                       : 'Créer une classe'
               }
               onClose={() => setActiveForm('')}>
               {error && <p className="alert alert-error">{error}</p>}
               <div className="content-grid">
                  {role === 'ADMIN' && activeForm === 'year' && (
                     <div className="panel">
                        <div className="panel-heading">
                           <div>
                              <p className="eyebrow">ANNÉES</p>
                              <h3>Créer une année scolaire</h3>
                           </div>
                        </div>
                        <form
                           className="form-grid one-column"
                           onSubmit={(event) => {
                              event.preventDefault();
                              const body = Object.fromEntries(
                                 Object.entries(yearForm).filter(
                                    ([, value]) => value
                                 )
                              );
                              run(
                                 () =>
                                    apiRequest('/academic-years', {
                                       token,
                                       method: 'POST',
                                       body,
                                    }),
                                 'Année scolaire créée.'
                              );
                           }}>
                           <label>
                              Libellé
                              <input
                                 value={yearForm.label}
                                 onChange={(event) =>
                                    setYearForm({
                                       ...yearForm,
                                       label: event.target.value,
                                    })
                                 }
                                 placeholder="2026-2027"
                                 pattern="[0-9]{4}-[0-9]{4}"
                                 required
                              />
                           </label>
                           <label>
                              Date de début
                              <input
                                 type="date"
                                 value={yearForm.startDate}
                                 onChange={(event) =>
                                    setYearForm({
                                       ...yearForm,
                                       startDate: event.target.value,
                                    })
                                 }
                              />
                           </label>
                           <label>
                              Date de fin
                              <input
                                 type="date"
                                 value={yearForm.endDate}
                                 onChange={(event) =>
                                    setYearForm({
                                       ...yearForm,
                                       endDate: event.target.value,
                                    })
                                 }
                              />
                           </label>
                           <button
                              className="button button-primary"
                              disabled={busy}>
                              Créer l’année
                           </button>
                        </form>
                     </div>
                  )}
                  {activeForm === 'program' && (
                     <div className="panel">
                        <div className="panel-heading">
                           <div>
                              <p className="eyebrow">PROGRAMMES</p>
                              <h3>Créer un programme</h3>
                           </div>
                        </div>
                        <form
                           className="form-grid one-column"
                           onSubmit={(event) => {
                              event.preventDefault();
                              run(
                                 () =>
                                    apiRequest('/programs', {
                                       token,
                                       method: 'POST',
                                       body: programForm,
                                    }),
                                 'Programme créé.'
                              );
                           }}>
                           <label>
                              Nom
                              <input
                                 value={programForm.name}
                                 onChange={(event) =>
                                    setProgramForm({
                                       ...programForm,
                                       name: event.target.value,
                                    })
                                 }
                                 required
                              />
                           </label>
                           <label>
                              Code
                              <input
                                 value={programForm.code}
                                 onChange={(event) =>
                                    setProgramForm({
                                       ...programForm,
                                       code: event.target.value,
                                    })
                                 }
                                 required
                              />
                           </label>
                           <label>
                              Description
                              <input
                                 value={programForm.description}
                                 onChange={(event) =>
                                    setProgramForm({
                                       ...programForm,
                                       description: event.target.value,
                                    })
                                 }
                              />
                           </label>
                           <button
                              className="button button-primary"
                              disabled={busy}>
                              Créer le programme
                           </button>
                        </form>
                     </div>
                  )}
                  {activeForm === 'class' && (
                     <div className="panel">
                        <div className="panel-heading">
                           <div>
                              <p className="eyebrow">CLASSES</p>
                              <h3>Créer une classe</h3>
                           </div>
                        </div>
                        <form
                           className="form-grid one-column"
                           onSubmit={(event) => {
                              event.preventDefault();
                              run(
                                 () =>
                                    apiRequest('/classes', {
                                       token,
                                       method: 'POST',
                                       body: {
                                          ...classForm,
                                          capacity: Number(classForm.capacity),
                                       },
                                    }),
                                 'Classe créée.'
                              );
                           }}>
                           <label>
                              Nom
                              <input
                                 value={classForm.name}
                                 onChange={(event) =>
                                    setClassForm({
                                       ...classForm,
                                       name: event.target.value,
                                    })
                                 }
                                 required
                              />
                           </label>
                           <label>
                              Niveau
                              <input
                                 value={classForm.level}
                                 onChange={(event) =>
                                    setClassForm({
                                       ...classForm,
                                       level: event.target.value,
                                    })
                                 }
                                 required
                              />
                           </label>
                           <label>
                              Année
                              <select
                                 value={classForm.academicYear}
                                 onChange={(event) =>
                                    setClassForm({
                                       ...classForm,
                                       academicYear: event.target.value,
                                    })
                                 }
                                 required>
                                 <option value="">Choisir</option>
                                 {years
                                    .filter((year) => year.status !== 'CLOSED')
                                    .map((year) => (
                                       <option key={year._id} value={year._id}>
                                          {year.label}
                                       </option>
                                    ))}
                              </select>
                           </label>
                           <label>
                              Programme
                              <select
                                 value={classForm.program}
                                 onChange={(event) =>
                                    setClassForm({
                                       ...classForm,
                                       program: event.target.value,
                                    })
                                 }
                                 required>
                                 <option value="">Choisir</option>
                                 {availablePrograms.map((program) => (
                                    <option
                                       key={program._id}
                                       value={program._id}>
                                       {program.name}
                                    </option>
                                 ))}
                              </select>
                           </label>
                           <label>
                              Capacité
                              <input
                                 type="number"
                                 min="1"
                                 step="1"
                                 value={classForm.capacity}
                                 onChange={(event) =>
                                    setClassForm({
                                       ...classForm,
                                       capacity: event.target.value,
                                    })
                                 }
                                 required
                              />
                           </label>
                           <button
                              className="button button-primary"
                              disabled={busy}>
                              Créer la classe
                           </button>
                        </form>
                     </div>
                  )}
               </div>
            </ModalDialog>
         )}
         <ManagementTabs
            label="Catalogues scolaires"
            active={activeCatalog}
            onChange={setActiveCatalog}
            tabs={[
               ...(role === 'ADMIN'
                  ? [{ id: 'years', label: 'Années', count: years.length }]
                  : []),
               { id: 'programs', label: 'Programmes', count: programs.length },
               { id: 'classes', label: 'Classes', count: classes.length },
            ]}
         />
         {role === 'ADMIN' && activeCatalog === 'years' && (
            <div className="panel">
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">CATALOGUE</p>
                     <h3>Années scolaires</h3>
                  </div>
               </div>
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Année</th>
                           <th>Statut</th>
                           <th>Action</th>
                        </tr>
                     </thead>
                     <tbody>
                        {years.map((year) => (
                           <tr key={year._id}>
                              <td>{year.label}</td>
                              <td>
                                 <span className="status-pill">
                                    {formatAcademicYearStatus(year.status)}
                                 </span>
                              </td>
                              <td>
                                 {year.status === 'PENDING' ? (
                                    <button
                                       className="text-button"
                                       disabled={busy}
                                       onClick={() =>
                                          run(
                                             () =>
                                                apiRequest(
                                                   `/academic-years/${year._id}/status`,
                                                   {
                                                      token,
                                                      method: 'PATCH',
                                                      body: {
                                                         status: 'ACTIVE',
                                                      },
                                                   }
                                                ),
                                             'Année activée.'
                                          )
                                       }>
                                       Activer
                                    </button>
                                 ) : year.status === 'ACTIVE' ? (
                                    <button
                                       className="text-button danger-text"
                                       disabled={busy}
                                       onClick={() =>
                                          run(
                                             () =>
                                                apiRequest(
                                                   `/academic-years/${year._id}/status`,
                                                   {
                                                      token,
                                                      method: 'PATCH',
                                                      body: {
                                                         status: 'CLOSED',
                                                      },
                                                   }
                                                ),
                                             'Année clôturée.'
                                          )
                                       }>
                                       Clôturer
                                    </button>
                                 ) : (
                                    <span className="muted">
                                       Consultation uniquement
                                    </span>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
         {activeCatalog === 'programs' && (
            <div className="panel">
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">CATALOGUE</p>
                     <h3>Programmes</h3>
                  </div>
               </div>
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Programme</th>
                           <th>Code</th>
                           <th>Statut</th>
                           <th />
                        </tr>
                     </thead>
                     <tbody>
                        {programs.map((program) => (
                           <tr key={program._id}>
                              <td>{program.name}</td>
                              <td>{program.code}</td>
                              <td>
                                 <span
                                    className={`status-pill ${program.isActive ? 'status-active' : 'status-muted'}`}>
                                    {program.isActive ? 'Actif' : 'Inactif'}
                                 </span>
                              </td>
                              <td>
                                 <button
                                    className="text-button"
                                    disabled={busy}
                                    onClick={() =>
                                       run(
                                          () =>
                                             apiRequest(
                                                `/programs/${program._id}/status`,
                                                {
                                                   token,
                                                   method: 'PATCH',
                                                   body: {
                                                      isActive:
                                                         !program.isActive,
                                                   },
                                                }
                                             ),
                                          program.isActive
                                             ? 'Programme désactivé.'
                                             : 'Programme activé.'
                                       )
                                    }>
                                    {program.isActive
                                       ? 'Désactiver'
                                       : 'Activer'}
                                 </button>
                              </td>
                           </tr>
                        ))}
                        {!programs.length && (
                           <tr>
                              <td colSpan="4" className="empty-cell">
                                 Aucun programme.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
         {activeCatalog === 'classes' && (
            <div className="panel">
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">CATALOGUE</p>
                     <h3>Classes</h3>
                  </div>
               </div>
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Classe</th>
                           <th>Année · programme</th>
                           <th>Statut</th>
                           <th />
                        </tr>
                     </thead>
                     <tbody>
                        {classes.map((schoolClass) => (
                           <tr key={schoolClass._id}>
                              <td>
                                 {schoolClass.name} · {schoolClass.level}
                              </td>
                              <td>
                                 {schoolClass.academicYear?.label} ·{' '}
                                 {schoolClass.program?.name}
                              </td>
                              <td>
                                 <span
                                    className={`status-pill ${schoolClass.isActive ? 'status-active' : 'status-muted'}`}>
                                    {schoolClass.isActive
                                       ? 'Active'
                                       : 'Inactive'}
                                 </span>
                              </td>
                              <td>
                                 <button
                                    className="text-button"
                                    disabled={
                                       busy ||
                                       schoolClass.academicYear?.status ===
                                          'CLOSED'
                                    }
                                    onClick={() =>
                                       run(
                                          () =>
                                             apiRequest(
                                                `/classes/${schoolClass._id}/status`,
                                                {
                                                   token,
                                                   method: 'PATCH',
                                                   body: {
                                                      isActive:
                                                         !schoolClass.isActive,
                                                   },
                                                }
                                             ),
                                          schoolClass.isActive
                                             ? 'Classe désactivée.'
                                             : 'Classe activée.'
                                       )
                                    }>
                                    {schoolClass.isActive
                                       ? 'Désactiver'
                                       : 'Activer'}
                                 </button>
                              </td>
                           </tr>
                        ))}
                        {!classes.length && (
                           <tr>
                              <td colSpan="4" className="empty-cell">
                                 Aucune classe.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
      </section>
   );
}

function SchoolingPanel({ token, role }) {
   const [students, setStudents] = useState([]);
   const [years, setYears] = useState([]);
   const [programs, setPrograms] = useState([]);
   const [classes, setClasses] = useState([]);
   const [enrollments, setEnrollments] = useState([]);
   const [studentSearch, setStudentSearch] = useState('');
   const [studentOptionSearch, setStudentOptionSearch] = useState('');
   const [enrollmentMatricule, setEnrollmentMatricule] = useState('');
   const [recordView, setRecordView] = useState('enrollments');
   const [activeCreation, setActiveCreation] = useState('');
   const [enrollmentFilters, setEnrollmentFilters] = useState({
      academicYear: '',
      program: '',
      status: '',
   });
   const [studentForm, setStudentForm] = useState({
      matricule: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      gender: '',
      email: '',
      phone: '',
      photo: '',
   });
   const [enrollmentForm, setEnrollmentForm] = useState({
      student: '',
      academicYear: '',
      program: '',
      class: '',
      administrativeInfo: {
         registrationDate: '',
         registrationNumber: '',
         observation: '',
      },
   });
   const [error, setError] = useState('');
   const [notice, setNotice] = useState('');
   const [busy, setBusy] = useState(false);
   const [correctionTarget, setCorrectionTarget] = useState(null);
   const [reviewTarget, setReviewTarget] = useState(null);
   const [deleteStudentTarget, setDeleteStudentTarget] = useState(null);
   const [deleteStudentBusy, setDeleteStudentBusy] = useState(false);
   const [rejectionReason, setRejectionReason] = useState('');

   const refresh = useCallback(async () => {
      const [studentData, yearData, programData, classData, enrollmentData] =
         await Promise.all([
            apiRequest('/students', { token }),
            apiRequest('/academic-years', { token }),
            apiRequest('/programs', { token }),
            apiRequest('/classes', { token }),
            apiRequest('/enrollments', { token }),
         ]);
      setStudents(studentData);
      setYears(yearData);
      setPrograms(programData);
      setClasses(classData);
      setEnrollments(enrollmentData);
   }, [token]);

   useEffect(() => {
      refresh().catch((requestError) => setError(requestError.message));
   }, [refresh]);

   const createStudent = async (event) => {
      event.preventDefault();
      setError('');
      setNotice('');
      setBusy(true);
      try {
         await apiRequest('/students', {
            token,
            method: 'POST',
            body: studentForm,
         });
         setStudentForm({
            matricule: '',
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            placeOfBirth: '',
            gender: '',
            email: '',
            phone: '',
            photo: '',
         });
         setNotice(
            'Élève enregistré. Vous pouvez maintenant créer son inscription.'
         );
         setRecordView('students');
         await refresh();
         setActiveCreation('');
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   const createEnrollment = async (event) => {
      event.preventDefault();
      setError('');
      setNotice('');
      setBusy(true);
      try {
         await apiRequest('/enrollments', {
            token,
            method: 'POST',
            body: enrollmentForm,
         });
         setNotice('Inscription créée et envoyée pour validation.');
         setRecordView('enrollments');
         setEnrollmentForm({ ...enrollmentForm, student: '' });
         setStudentOptionSearch('');
         await refresh();
         setActiveCreation('');
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   const deleteStudent = async () => {
      if (!deleteStudentTarget) return;
      setError('');
      setDeleteStudentBusy(true);
      try {
         const removed = await apiRequest(
            `/students/${deleteStudentTarget._id}`,
            { token, method: 'DELETE' }
         );
         const details = [
            `${removed.enrollmentCount} inscription(s)`,
            `${removed.gradeCount} note(s)`,
            ...(removed.linkedAccountRemoved ? ['compte eleve'] : []),
         ];
         setNotice(
            `Dossier ${deleteStudentTarget.matricule} supprime avec ses donnees : ${details.join(', ')}.`
         );
         setDeleteStudentTarget(null);
         await refresh();
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setDeleteStudentBusy(false);
      }
   };

   const reviewEnrollment = async (enrollment, decision, reason = '') => {
      if (decision === 'REJECTED' && !reason.trim()) {
         setReviewTarget(enrollment);
         setRejectionReason('');
         return;
      }
      setError('');
      try {
         await apiRequest(`/enrollments/${enrollment._id}/review`, {
            token,
            method: 'PATCH',
            body: { decision, rejectionReason: reason },
         });
         setNotice(
            decision === 'APPROVED'
               ? 'Inscription approuvée.'
               : 'Inscription rejetée avec son motif.'
         );
         setReviewTarget(null);
         await refresh();
      } catch (requestError) {
         setError(requestError.message);
      }
   };

   const startCorrection = (enrollment) => {
      setCorrectionTarget(enrollment);
      setStudentOptionSearch('');
      setEnrollmentForm({
         student: enrollment.student?._id || '',
         academicYear: enrollment.academicYear?._id || '',
         program: enrollment.program?._id || '',
         class: enrollment.class?._id || '',
         administrativeInfo: {
            registrationDate: enrollment.administrativeInfo?.registrationDate
               ? new Date(enrollment.administrativeInfo.registrationDate)
                    .toISOString()
                    .slice(0, 10)
               : '',
            registrationNumber:
               enrollment.administrativeInfo?.registrationNumber || '',
            observation: enrollment.administrativeInfo?.observation || '',
         },
      });
   };

   const resubmitEnrollment = async (event) => {
      event.preventDefault();
      if (!correctionTarget) return;
      setError('');
      try {
         await apiRequest(`/enrollments/${correctionTarget._id}/resubmit`, {
            token,
            method: 'PATCH',
            body: enrollmentForm,
         });
         setNotice('Inscription renvoyée pour validation.');
         setCorrectionTarget(null);
         await refresh();
      } catch (requestError) {
         setError(requestError.message);
      }
   };

   const availablePrograms = programs.filter((program) => program.isActive);
   const availableClasses = classes.filter(
      (schoolClass) =>
         schoolClass.isActive &&
         (!enrollmentForm.academicYear ||
            schoolClass.academicYear?._id === enrollmentForm.academicYear) &&
         (!enrollmentForm.program ||
            schoolClass.program?._id === enrollmentForm.program)
   );
   const filteredEnrollments = enrollments.filter(
      (enrollment) =>
         (!enrollmentFilters.academicYear ||
            enrollment.academicYear?._id === enrollmentFilters.academicYear) &&
         (!enrollmentFilters.program ||
            enrollment.program?._id === enrollmentFilters.program) &&
         (!enrollmentFilters.status ||
            enrollment.status === enrollmentFilters.status) &&
         (!enrollmentMatricule.trim() ||
            enrollment.student?.matricule
               ?.toLocaleUpperCase('fr')
               .includes(enrollmentMatricule.trim().toLocaleUpperCase('fr')))
   );
   const normalizedStudentSearch = studentSearch.trim().toLocaleUpperCase('fr');
   const filteredStudents = students.filter(
      (student) =>
         !normalizedStudentSearch ||
         student.matricule
            ?.toLocaleUpperCase('fr')
            .includes(normalizedStudentSearch)
   );
   const normalizedStudentOptionSearch = studentOptionSearch
      .trim()
      .toLocaleUpperCase('fr');
   const matchingStudentOptions = students.filter(
      (student) =>
         student._id === enrollmentForm.student ||
         !normalizedStudentOptionSearch ||
         student.matricule
            ?.toLocaleUpperCase('fr')
            .includes(normalizedStudentOptionSearch)
   );

   return (
      <section className="schooling-workspace">
         {error &&
            !activeCreation &&
            !correctionTarget &&
            !reviewTarget &&
            !deleteStudentTarget && (
               <p className="alert alert-error">{error}</p>
            )}
         {notice && <p className="alert alert-success">{notice}</p>}
         {role === 'DIRECTEUR_SCOLARITE' && (
            <div className="panel action-launcher">
               <div>
                  <p className="eyebrow">SCOLARITÉ</p>
                  <h3>Créer un dossier</h3>
               </div>
               <div className="launcher-actions">
                  <button
                     className="button button-secondary"
                     onClick={() => {
                        setError('');
                        setActiveCreation('student');
                     }}>
                     Nouvel élève
                  </button>
                  <button
                     className="button button-primary"
                     onClick={() => {
                        setError('');
                        setStudentOptionSearch('');
                        setActiveCreation('enrollment');
                     }}>
                     Nouvelle inscription
                  </button>
               </div>
            </div>
         )}
         {role === 'DIRECTEUR_SCOLARITE' && activeCreation && (
            <ModalDialog
               eyebrow="GESTION DE LA SCOLARITÉ"
               title={
                  activeCreation === 'student'
                     ? 'Enregistrer un élève'
                     : 'Créer une inscription'
               }
               onClose={() => setActiveCreation('')}>
               {error && <p className="alert alert-error">{error}</p>}
               <div className="content-grid">
                  {activeCreation === 'student' && (
                     <div className="panel">
                        <div className="panel-heading">
                           <div>
                              <p className="eyebrow">SCOLARITÉ</p>
                              <h3>Enregistrer un élève</h3>
                           </div>
                        </div>
                        <form className="form-grid" onSubmit={createStudent}>
                           <label>
                              Matricule
                              <input
                                 value={studentForm.matricule}
                                 onChange={(event) =>
                                    setStudentForm({
                                       ...studentForm,
                                       matricule: event.target.value,
                                    })
                                 }
                                 required
                              />
                           </label>
                           <label>
                              Prénom
                              <input
                                 value={studentForm.firstName}
                                 onChange={(event) =>
                                    setStudentForm({
                                       ...studentForm,
                                       firstName: event.target.value,
                                    })
                                 }
                                 required
                              />
                           </label>
                           <label>
                              Nom
                              <input
                                 value={studentForm.lastName}
                                 onChange={(event) =>
                                    setStudentForm({
                                       ...studentForm,
                                       lastName: event.target.value,
                                    })
                                 }
                                 required
                              />
                           </label>
                           <label>
                              Date de naissance
                              <input
                                 type="date"
                                 value={studentForm.dateOfBirth}
                                 onChange={(event) =>
                                    setStudentForm({
                                       ...studentForm,
                                       dateOfBirth: event.target.value,
                                    })
                                 }
                              />
                           </label>
                           <label>
                              Lieu de naissance
                              <input
                                 value={studentForm.placeOfBirth}
                                 onChange={(event) =>
                                    setStudentForm({
                                       ...studentForm,
                                       placeOfBirth: event.target.value,
                                    })
                                 }
                              />
                           </label>
                           <label>
                              Sexe
                              <select
                                 value={studentForm.gender}
                                 onChange={(event) =>
                                    setStudentForm({
                                       ...studentForm,
                                       gender: event.target.value,
                                    })
                                 }>
                                 <option value="">Non précisé</option>
                                 <option value="F">Féminin</option>
                                 <option value="M">Masculin</option>
                                 <option value="OTHER">Autre</option>
                              </select>
                           </label>
                           <label>
                              Email
                              <input
                                 type="email"
                                 value={studentForm.email}
                                 onChange={(event) =>
                                    setStudentForm({
                                       ...studentForm,
                                       email: event.target.value,
                                    })
                                 }
                                 required
                              />
                           </label>
                           <label className="span-2">
                              Téléphone
                              <input
                                 value={studentForm.phone}
                                 onChange={(event) =>
                                    setStudentForm({
                                       ...studentForm,
                                       phone: event.target.value,
                                    })
                                 }
                              />
                           </label>
                           <label className="span-2">
                              Photo (URL)
                              <input
                                 type="url"
                                 value={studentForm.photo}
                                 onChange={(event) =>
                                    setStudentForm({
                                       ...studentForm,
                                       photo: event.target.value,
                                    })
                                 }
                              />
                           </label>
                           <button
                              className="button button-primary span-2"
                              disabled={busy}>
                              Enregistrer l’élève
                           </button>
                        </form>
                     </div>
                  )}
                  {activeCreation === 'enrollment' && (
                     <div className="panel">
                        <div className="panel-heading">
                           <div>
                              <p className="eyebrow">INSCRIPTION</p>
                              <h3>Créer une inscription</h3>
                           </div>
                        </div>
                        <form
                           className="form-grid one-column"
                           onSubmit={createEnrollment}>
                           <MatriculeFilter
                              id="new-enrollment-student-matricule"
                              value={studentOptionSearch}
                              onChange={setStudentOptionSearch}
                           />
                           <label>
                              Élève
                              <select
                                 value={enrollmentForm.student}
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       student: event.target.value,
                                    })
                                 }
                                 required>
                                 <option value="">Choisir un élève</option>
                                 {matchingStudentOptions.map((student) => (
                                    <option
                                       key={student._id}
                                       value={student._id}>
                                       {student.matricule} · {student.firstName}{' '}
                                       {student.lastName}
                                    </option>
                                 ))}
                              </select>
                           </label>
                           <label>
                              Année scolaire
                              <select
                                 value={enrollmentForm.academicYear}
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       academicYear: event.target.value,
                                       class: '',
                                    })
                                 }
                                 required>
                                 <option value="">Choisir une année</option>
                                 {years
                                    .filter((year) => year.status !== 'CLOSED')
                                    .map((year) => (
                                       <option key={year._id} value={year._id}>
                                          {year.label} ·{' '}
                                          {formatAcademicYearStatus(
                                             year.status
                                          )}
                                       </option>
                                    ))}
                              </select>
                           </label>
                           <label>
                              Programme
                              <select
                                 value={enrollmentForm.program}
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       program: event.target.value,
                                       class: '',
                                    })
                                 }
                                 required>
                                 <option value="">Choisir un programme</option>
                                 {availablePrograms.map((program) => (
                                    <option
                                       key={program._id}
                                       value={program._id}>
                                       {program.name}
                                    </option>
                                 ))}
                              </select>
                           </label>
                           <label>
                              Classe
                              <select
                                 value={enrollmentForm.class}
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       class: event.target.value,
                                    })
                                 }
                                 required>
                                 <option value="">Choisir une classe</option>
                                 {availableClasses.map((schoolClass) => (
                                    <option
                                       key={schoolClass._id}
                                       value={schoolClass._id}>
                                       {schoolClass.name} · {schoolClass.level}
                                    </option>
                                 ))}
                              </select>
                           </label>
                           <label>
                              Date d’inscription
                              <input
                                 type="date"
                                 value={
                                    enrollmentForm.administrativeInfo
                                       .registrationDate
                                 }
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       administrativeInfo: {
                                          ...enrollmentForm.administrativeInfo,
                                          registrationDate: event.target.value,
                                       },
                                    })
                                 }
                              />
                           </label>
                           <label>
                              Numéro d’inscription
                              <input
                                 value={
                                    enrollmentForm.administrativeInfo
                                       .registrationNumber
                                 }
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       administrativeInfo: {
                                          ...enrollmentForm.administrativeInfo,
                                          registrationNumber:
                                             event.target.value,
                                       },
                                    })
                                 }
                              />
                           </label>
                           <label className="span-2">
                              Observation administrative
                              <textarea
                                 value={
                                    enrollmentForm.administrativeInfo
                                       .observation
                                 }
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       administrativeInfo: {
                                          ...enrollmentForm.administrativeInfo,
                                          observation: event.target.value,
                                       },
                                    })
                                 }
                                 rows="2"
                              />
                           </label>
                           <button
                              className="button button-primary"
                              disabled={busy}>
                              Créer l’inscription
                           </button>
                        </form>
                     </div>
                  )}
               </div>
            </ModalDialog>
         )}

         <ManagementTabs
            label="Dossiers de scolarité"
            active={recordView}
            onChange={setRecordView}
            tabs={[
               {
                  id: 'enrollments',
                  label: 'Inscriptions',
                  count: enrollments.length,
               },
               {
                  id: 'students',
                  label: 'Répertoire des élèves',
                  count: students.length,
               },
            ]}
         />

         {recordView === 'students' && (
            <>
               <div className="panel">
                  <div className="panel-heading">
                     <div>
                        <p className="eyebrow">CATALOGUE</p>
                        <h3>Répertoire des élèves</h3>
                     </div>
                     <span className="muted">
                        {filteredStudents.length} / {students.length}
                     </span>
                  </div>
                  <MatriculeFilter
                     id="student-directory-matricule"
                     value={studentSearch}
                     onChange={setStudentSearch}
                     count={filteredStudents.length}
                     total={students.length}
                  />
                  <div className="table-wrap">
                     <table>
                        <thead>
                           <tr>
                              <th>Matricule</th>
                              <th>Nom</th>
                              <th>Email</th>
                              <th>Telephone</th>
                              {role === 'ADMIN' && <th>Actions</th>}
                           </tr>
                        </thead>
                        <tbody>
                           {filteredStudents.map((student) => (
                              <tr key={student._id}>
                                 <td>{student.matricule}</td>
                                 <td>
                                    {student.firstName} {student.lastName}
                                 </td>
                                 <td>{student.email || '—'}</td>
                                 <td>{student.phone || '\u2014'}</td>
                                 {role === 'ADMIN' && (
                                    <td>
                                       <button
                                          className="text-button danger-text"
                                          onClick={() => {
                                             setError('');
                                             setDeleteStudentTarget(student);
                                          }}>
                                          Supprimer
                                       </button>
                                    </td>
                                 )}
                              </tr>
                           ))}
                           {!filteredStudents.length && (
                              <tr>
                                 <td
                                    colSpan={role === 'ADMIN' ? '5' : '4'}
                                    className="empty-cell">
                                    {students.length
                                       ? 'Aucun eleve ne correspond a cette recherche.'
                                       : 'Aucun eleve enregistre.'}
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </>
         )}

         {deleteStudentTarget && (
            <ModalDialog
               eyebrow="SUPPRESSION DE DOSSIER"
               title={`Eleve ${deleteStudentTarget.matricule}`}
               onClose={() => {
                  setDeleteStudentTarget(null);
                  setError('');
               }}>
               <div className="confirmation-content">
                  <p>
                     Supprimer definitivement le dossier de{' '}
                     <strong>
                        {deleteStudentTarget.firstName}{' '}
                        {deleteStudentTarget.lastName}
                     </strong>{' '}
                     ?
                  </p>
                  <p className="muted">
                     Cette action supprime aussi toutes ses inscriptions, ses
                     notes et son compte eleve associe. Les dossiers des autres
                     eleves restent inchanges.
                  </p>
                  {error && <p className="alert alert-error">{error}</p>}
                  <div className="modal-actions">
                     <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                           setDeleteStudentTarget(null);
                           setError('');
                        }}>
                        Annuler
                     </button>
                     <button
                        className="button button-danger"
                        type="button"
                        disabled={deleteStudentBusy}
                        onClick={deleteStudent}>
                        {deleteStudentBusy
                           ? 'Suppression...'
                           : 'Supprimer le dossier et ses donnees'}
                     </button>
                  </div>
               </div>
            </ModalDialog>
         )}

         {recordView === 'enrollments' && (
            <div className="panel enrollment-panel">
               {correctionTarget && (
                  <ModalDialog
                     eyebrow="CORRECTION D’INSCRIPTION"
                     title={`Dossier ${correctionTarget.student?.matricule}`}
                     onClose={() => setCorrectionTarget(null)}>
                     <form
                        className="correction-form"
                        onSubmit={resubmitEnrollment}>
                        {error && <p className="alert alert-error">{error}</p>}
                        <div className="panel-heading">
                           <div>
                              <p className="eyebrow">CORRECTION</p>
                              <h3>
                                 {correctionTarget.student?.matricule} ·{' '}
                                 {correctionTarget.rejectionReason}
                              </h3>
                           </div>
                           <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => setCorrectionTarget(null)}>
                              Annuler
                           </button>
                        </div>
                        <div className="form-grid">
                           <MatriculeFilter
                              id="correction-enrollment-student-matricule"
                              value={studentOptionSearch}
                              onChange={setStudentOptionSearch}
                           />
                           <label>
                              Élève
                              <select
                                 value={enrollmentForm.student}
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       student: event.target.value,
                                    })
                                 }
                                 required>
                                 {matchingStudentOptions.map((student) => (
                                    <option
                                       key={student._id}
                                       value={student._id}>
                                       {student.matricule} · {student.firstName}{' '}
                                       {student.lastName}
                                    </option>
                                 ))}
                              </select>
                           </label>
                           <label>
                              Année
                              <select
                                 value={enrollmentForm.academicYear}
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       academicYear: event.target.value,
                                       class: '',
                                    })
                                 }
                                 required>
                                 {years
                                    .filter((year) => year.status !== 'CLOSED')
                                    .map((year) => (
                                       <option key={year._id} value={year._id}>
                                          {year.label}
                                       </option>
                                    ))}
                              </select>
                           </label>
                           <label>
                              Programme
                              <select
                                 value={enrollmentForm.program}
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       program: event.target.value,
                                       class: '',
                                    })
                                 }
                                 required>
                                 {availablePrograms.map((program) => (
                                    <option
                                       key={program._id}
                                       value={program._id}>
                                       {program.name}
                                    </option>
                                 ))}
                              </select>
                           </label>
                           <label>
                              Classe
                              <select
                                 value={enrollmentForm.class}
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       class: event.target.value,
                                    })
                                 }
                                 required>
                                 <option value="">Choisir une classe</option>
                                 {availableClasses.map((schoolClass) => (
                                    <option
                                       key={schoolClass._id}
                                       value={schoolClass._id}>
                                       {schoolClass.name} · {schoolClass.level}
                                    </option>
                                 ))}
                              </select>
                           </label>
                           <label>
                              Date d’inscription
                              <input
                                 type="date"
                                 value={
                                    enrollmentForm.administrativeInfo
                                       .registrationDate
                                 }
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       administrativeInfo: {
                                          ...enrollmentForm.administrativeInfo,
                                          registrationDate: event.target.value,
                                       },
                                    })
                                 }
                              />
                           </label>
                           <label>
                              Numéro d’inscription
                              <input
                                 value={
                                    enrollmentForm.administrativeInfo
                                       .registrationNumber
                                 }
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       administrativeInfo: {
                                          ...enrollmentForm.administrativeInfo,
                                          registrationNumber:
                                             event.target.value,
                                       },
                                    })
                                 }
                              />
                           </label>
                           <label className="span-2">
                              Observation administrative
                              <textarea
                                 value={
                                    enrollmentForm.administrativeInfo
                                       .observation
                                 }
                                 onChange={(event) =>
                                    setEnrollmentForm({
                                       ...enrollmentForm,
                                       administrativeInfo: {
                                          ...enrollmentForm.administrativeInfo,
                                          observation: event.target.value,
                                       },
                                    })
                                 }
                                 rows="2"
                              />
                           </label>
                           <button className="button button-primary span-2">
                              Enregistrer et renvoyer
                           </button>
                        </div>
                     </form>
                  </ModalDialog>
               )}
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">DOSSIERS</p>
                     <h3>
                        {role === 'ADMIN'
                           ? 'Inscriptions à contrôler'
                           : 'Inscriptions et corrections'}
                     </h3>
                  </div>
                  <button
                     className="button button-secondary"
                     onClick={() =>
                        refresh().catch((e) => setError(e.message))
                     }>
                     Actualiser
                  </button>
               </div>
               <div className="form-grid enrollment-filters">
                  <label>
                     Matricule
                     <input
                        type="search"
                        value={enrollmentMatricule}
                        onChange={(event) =>
                           setEnrollmentMatricule(event.target.value)
                        }
                        placeholder="Filtrer les élèves"
                     />
                  </label>
                  <label>
                     Année
                     <select
                        value={enrollmentFilters.academicYear}
                        onChange={(event) =>
                           setEnrollmentFilters({
                              ...enrollmentFilters,
                              academicYear: event.target.value,
                           })
                        }>
                        <option value="">Toutes les années</option>
                        {years.map((year) => (
                           <option key={year._id} value={year._id}>
                              {year.label}
                           </option>
                        ))}
                     </select>
                  </label>
                  <label>
                     Programme
                     <select
                        value={enrollmentFilters.program}
                        onChange={(event) =>
                           setEnrollmentFilters({
                              ...enrollmentFilters,
                              program: event.target.value,
                           })
                        }>
                        <option value="">Tous les programmes</option>
                        {programs.map((program) => (
                           <option key={program._id} value={program._id}>
                              {program.name}
                           </option>
                        ))}
                     </select>
                  </label>
                  <label>
                     Statut
                     <select
                        value={enrollmentFilters.status}
                        onChange={(event) =>
                           setEnrollmentFilters({
                              ...enrollmentFilters,
                              status: event.target.value,
                           })
                        }>
                        <option value="">Tous les statuts</option>
                        <option value="PENDING">En attente</option>
                        <option value="APPROVED">Approuvée</option>
                        <option value="REJECTED">Rejetée</option>
                     </select>
                  </label>
               </div>
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Élève</th>
                           <th>Année</th>
                           <th>Programme</th>
                           <th>Classe</th>
                           <th>Statut</th>
                           <th>Motif / action</th>
                        </tr>
                     </thead>
                     <tbody>
                        {filteredEnrollments.map((enrollment) => (
                           <tr key={enrollment._id}>
                              <td>
                                 {enrollment.student?.matricule}
                                 <small className="table-subtitle">
                                    {enrollment.student?.firstName}{' '}
                                    {enrollment.student?.lastName}
                                 </small>
                              </td>
                              <td>{enrollment.academicYear?.label}</td>
                              <td>{enrollment.program?.name}</td>
                              <td>{enrollment.class?.name}</td>
                              <td>
                                 <span
                                    className={`status-pill ${enrollment.status === 'APPROVED' ? 'status-active' : enrollment.status === 'PENDING' ? 'status-pending' : 'status-muted'}`}>
                                    {formatEnrollmentStatus(enrollment.status)}
                                 </span>
                              </td>
                              <td>
                                 {role === 'ADMIN' &&
                                 enrollment.status === 'PENDING' ? (
                                    <div className="table-actions">
                                       <button
                                          className="text-button"
                                          onClick={() =>
                                             reviewEnrollment(
                                                enrollment,
                                                'APPROVED'
                                             )
                                          }>
                                          Approuver
                                       </button>
                                       <button
                                          className="text-button danger-text"
                                          onClick={() =>
                                             reviewEnrollment(
                                                enrollment,
                                                'REJECTED'
                                             )
                                          }>
                                          Rejeter
                                       </button>
                                    </div>
                                 ) : role === 'DIRECTEUR_SCOLARITE' &&
                                   enrollment.status === 'REJECTED' ? (
                                    <div>
                                       <small className="correction-reason">
                                          {enrollment.rejectionReason}
                                       </small>
                                       <button
                                          className="text-button"
                                          onClick={() =>
                                             startCorrection(enrollment)
                                          }>
                                          Corriger / renvoyer
                                       </button>
                                    </div>
                                 ) : (
                                    <span className="muted">—</span>
                                 )}
                              </td>
                           </tr>
                        ))}
                        {!filteredEnrollments.length && (
                           <tr>
                              <td colSpan="6" className="empty-cell">
                                 Aucune inscription ne correspond aux filtres.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
         {reviewTarget && (
            <ModalDialog
               eyebrow="VALIDATION D’INSCRIPTION"
               title="Motif du rejet"
               onClose={() => setReviewTarget(null)}>
               {error && <p className="alert alert-error">{error}</p>}
               <form
                  className="form-grid one-column"
                  onSubmit={(event) => {
                     event.preventDefault();
                     if (rejectionReason.trim())
                        reviewEnrollment(
                           reviewTarget,
                           'REJECTED',
                           rejectionReason
                        );
                     else setError('Le motif du rejet ne peut pas être vide.');
                  }}>
                  <p className="muted">
                     Élève : {reviewTarget.student?.firstName}{' '}
                     {reviewTarget.student?.lastName} ·{' '}
                     {reviewTarget.student?.matricule}
                  </p>
                  <label>
                     Motif obligatoire
                     <textarea
                        value={rejectionReason}
                        onChange={(event) =>
                           setRejectionReason(event.target.value)
                        }
                        maxLength="500"
                        rows="4"
                        required
                     />
                  </label>
                  <div className="modal-actions">
                     <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setReviewTarget(null)}>
                        Annuler
                     </button>
                     <button className="button button-primary">
                        Rejeter l’inscription
                     </button>
                  </div>
               </form>
            </ModalDialog>
         )}
      </section>
   );
}

function StudiesPanel({ token, initialDataView = 'evaluations' }) {
   const [catalog, setCatalog] = useState({
      years: [],
      programs: [],
      classes: [],
      subjects: [],
      teachers: [],
      assignments: [],
      evaluations: [],
      configurations: [],
      globalSettings: null,
   });
   const [activeDataView, setActiveDataView] = useState(initialDataView);
   const [grades, setGrades] = useState([]);
   const [selectedEvaluation, setSelectedEvaluation] = useState('');
   const [gradeClassFilter, setGradeClassFilter] = useState('');
   const [gradeModuleFilter, setGradeModuleFilter] = useState('');
   const [gradeSubjectFilter, setGradeSubjectFilter] = useState('');
   const [gradeTeacherFilter, setGradeTeacherFilter] = useState('');
   const [gradeStatusFilter, setGradeStatusFilter] = useState('SUBMITTED');
   const [gradeLoading, setGradeLoading] = useState(false);
   const [busyGradeId, setBusyGradeId] = useState('');
   const [gradeMatriculeFilter, setGradeMatriculeFilter] = useState('');
   const [activeForm, setActiveForm] = useState('');
   const [gradeReviewTarget, setGradeReviewTarget] = useState(null);
   const [gradeReviewReason, setGradeReviewReason] = useState('');
   const [evaluationToClose, setEvaluationToClose] = useState(null);
   const [subjectForm, setSubjectForm] = useState({
      name: '',
      code: '',
      description: '',
      academicYear: '',
      program: '',
      level: '',
      module: 'MODULE_1',
      coefficient: '1',
      evaluationMethod: 'ARITHMETIC_MEAN',
      oralWeight: '1',
      writtenWeight: '1',
      compositionWeight: '1',
   });
   const [globalSettingsForm, setGlobalSettingsForm] = useState({
      resultScale: '',
      admissionThreshold: '',
      overallMethod: 'WEIGHTED_MEAN',
   });
   const [assignmentForm, setAssignmentForm] = useState({
      teacher: '',
      subject: '',
      program: '',
      class: '',
      academicYear: '',
   });
   const [evaluationForm, setEvaluationForm] = useState({
      assignment: '',
      name: '',
      type: 'NORMAL',
      period: 'MODULE_1',
      weight: '1',
   });
   const [teacherForm, setTeacherForm] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
   });
   const [teacherTemporaryPassword, setTeacherTemporaryPassword] = useState('');
   const [error, setError] = useState('');
   const [notice, setNotice] = useState('');
   const [busy, setBusy] = useState(false);
   const gradeLoadRequestId = useRef(0);

   const refresh = useCallback(async () => {
      const [
         years,
         programs,
         classes,
         subjects,
         teachers,
         assignments,
         evaluations,
         configurations,
         globalSettings,
      ] = await Promise.all([
         apiRequest('/academic-years', { token }),
         apiRequest('/programs', { token }),
         apiRequest('/classes', { token }),
         apiRequest('/subjects', { token }),
         apiRequest('/users/teachers', { token }),
         apiRequest('/teaching-assignments', { token }),
         apiRequest('/evaluations', { token }),
         apiRequest('/subjects/configurations', { token }),
         apiRequest('/academic-settings', { token }),
      ]);
      setCatalog({
         years,
         programs: programs.filter((item) => item.isActive),
         classes: classes.filter((item) => item.isActive),
         subjects,
         teachers,
         assignments,
         evaluations,
         configurations,
         globalSettings,
      });
      setGlobalSettingsForm({
         resultScale: String(globalSettings?.resultScale ?? ''),
         admissionThreshold: String(globalSettings?.admissionThreshold ?? ''),
         overallMethod:
            globalSettings?.calculationRules?.overallMethod ?? 'WEIGHTED_MEAN',
      });
   }, [token]);

   useEffect(() => {
      refresh().catch((requestError) => setError(requestError.message));
   }, [refresh]);

   const act = async (path, method, body, message) => {
      setBusy(true);
      setError('');
      setNotice('');
      try {
         await apiRequest(path, { token, method, body });
         setNotice(message);
         await refresh();
         setActiveForm('');
         return true;
      } catch (requestError) {
         setError(requestError.message);
         return false;
      } finally {
         setBusy(false);
      }
   };

   const createTeacher = async (event) => {
      event.preventDefault();
      setError('');
      setNotice('');
      setTeacherTemporaryPassword('');
      setBusy(true);
      try {
         const result = await apiRequest('/users/teachers', {
            token,
            method: 'POST',
            body: teacherForm,
         });
         setTeacherTemporaryPassword(result.temporaryPassword);
         setTeacherForm({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
         });
         setNotice(
            'Compte enseignant créé. Transmettez le mot de passe temporaire de façon sécurisée.'
         );
         await refresh();
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   const createSubject = async (event) => {
      event.preventDefault();
      const {
         academicYear,
         program,
         level,
         module,
         coefficient,
         evaluationMethod,
         oralWeight,
         writtenWeight,
         compositionWeight,
         ...subject
      } = subjectForm;
      const created = await act(
         '/subjects',
         'POST',
         {
            ...subject,
            configuration: {
               academicYear,
               program,
               level,
               module,
               coefficient: Number(coefficient),
               calculationRules: {
                  evaluationMethod,
                  componentWeights: {
                     oral: Number(oralWeight),
                     written: Number(writtenWeight),
                     composition: Number(compositionWeight),
                  },
               },
            },
         },
         'Matière et paramètres pédagogiques créés.'
      );
      if (created) {
         setSubjectForm({
            name: '',
            code: '',
            description: '',
            academicYear: '',
            program: '',
            level: '',
            module: 'MODULE_1',
            coefficient: '1',
            evaluationMethod: 'ARITHMETIC_MEAN',
            oralWeight: '1',
            writtenWeight: '1',
            compositionWeight: '1',
         });
      }
   };

   const loadGrades = async (evaluationId) => {
      const requestId = ++gradeLoadRequestId.current;
      setSelectedEvaluation(evaluationId);
      setGradeStatusFilter('SUBMITTED');
      setGradeMatriculeFilter('');
      setGrades([]);
      setError('');
      if (!evaluationId) {
         setGradeLoading(false);
         return;
      }
      setGradeLoading(true);
      try {
         const data = await apiRequest(`/evaluations/${evaluationId}/grades`, {
            token,
         });
         if (requestId === gradeLoadRequestId.current) setGrades(data);
      } catch (requestError) {
         if (requestId === gradeLoadRequestId.current)
            setError(requestError.message);
      } finally {
         if (requestId === gradeLoadRequestId.current) setGradeLoading(false);
      }
   };

   const normalizedGradeMatricule = gradeMatriculeFilter
      .trim()
      .toLocaleUpperCase('fr');
   const statusFilteredGrades = grades.filter(
      (grade) =>
         gradeStatusFilter === 'ALL' || grade.status === gradeStatusFilter
   );
   const visibleGrades = statusFilteredGrades.filter(
      (grade) =>
         !normalizedGradeMatricule ||
         grade.enrollment?.student?.matricule
            ?.toLocaleUpperCase('fr')
            .includes(normalizedGradeMatricule)
   );
   const gradeCounts = [
      'SUBMITTED',
      'NEEDS_CORRECTION',
      'VALIDATED',
      'LOCKED',
   ].map((status) => ({
      status,
      count: grades.filter((grade) => grade.status === status).length,
   }));
   const uniqueEvaluationEntities = (key) =>
      [
         ...new Map(
            catalog.evaluations
               .map((item) => item.assignment?.[key])
               .filter((item) => item?._id)
               .map((item) => [String(item._id), item])
         ).values(),
      ].sort((first, second) =>
         `${first.name || first.lastName || ''} ${first.firstName || ''}`.localeCompare(
            `${second.name || second.lastName || ''} ${second.firstName || ''}`,
            'fr',
            { sensitivity: 'base' }
         )
      );
   const gradeFilterClasses = uniqueEvaluationEntities('class');
   const gradeFilterSubjects = uniqueEvaluationEntities('subject');
   const gradeFilterTeachers = uniqueEvaluationEntities('teacher');
   const filteredGradeEvaluations = catalog.evaluations.filter((item) => {
      const assignment = item.assignment || {};
      return (
         (!gradeClassFilter ||
            String(assignment.class?._id || assignment.class) ===
               gradeClassFilter) &&
         (!gradeModuleFilter || item.period === gradeModuleFilter) &&
         (!gradeSubjectFilter ||
            String(assignment.subject?._id || assignment.subject) ===
               gradeSubjectFilter) &&
         (!gradeTeacherFilter ||
            String(assignment.teacher?._id || assignment.teacher) ===
               gradeTeacherFilter)
      );
   });
   const activeGradeFilterCount = [
      gradeClassFilter,
      gradeModuleFilter,
      gradeSubjectFilter,
      gradeTeacherFilter,
   ].filter(Boolean).length;

   const review = async (grade, decision, reason = '') => {
      if (decision === 'NEEDS_CORRECTION' && !reason.trim()) {
         setGradeReviewTarget(grade);
         setGradeReviewReason('');
         return;
      }
      setError('');
      setBusyGradeId(grade._id);
      try {
         await apiRequest(`/grades/${grade._id}/review`, {
            token,
            method: 'PATCH',
            body: { decision, reason },
         });
         setNotice(
            decision === 'VALIDATED'
               ? 'Note validée. Vous pouvez maintenant la verrouiller.'
               : 'Note retournée à l’enseignant.'
         );
         setGradeReviewTarget(null);
         await refresh();
         if (selectedEvaluation)
            setGrades(
               await apiRequest(`/evaluations/${selectedEvaluation}/grades`, {
                  token,
               })
            );
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusyGradeId('');
      }
   };

   const requestGradeModification = async (grade, reason) => {
      setError('');
      setBusyGradeId(grade._id);
      try {
         await apiRequest(`/grades/${grade._id}/correction-requests`, {
            token,
            method: 'POST',
            body: { reason },
         });
         setNotice('Demande de modification envoyée à l’ADMIN.');
         setGradeReviewTarget(null);
         await refresh();
         if (selectedEvaluation)
            setGrades(
               await apiRequest(`/evaluations/${selectedEvaluation}/grades`, {
                  token,
               })
            );
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusyGradeId('');
      }
   };

   const lock = async (grade) => {
      setError('');
      setBusyGradeId(grade._id);
      try {
         await apiRequest(`/grades/${grade._id}/lock`, {
            token,
            method: 'PATCH',
         });
         setNotice('Note verrouillée.');
         await refresh();
         if (selectedEvaluation)
            setGrades(
               await apiRequest(`/evaluations/${selectedEvaluation}/grades`, {
                  token,
               })
            );
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusyGradeId('');
      }
   };

   const closeEvaluation = async (evaluation) => {
      setEvaluationToClose(evaluation);
   };

   const confirmCloseEvaluation = async () => {
      if (!evaluationToClose) return;
      const closed = await act(
         `/evaluations/${evaluationToClose._id}/close`,
         'PATCH',
         undefined,
         'Évaluation clôturée.'
      );
      if (closed) setEvaluationToClose(null);
   };

   const levels = [
      ...new Set(
         catalog.classes
            .filter(
               (item) =>
                  (!subjectForm.academicYear ||
                     item.academicYear?._id === subjectForm.academicYear) &&
                  (!subjectForm.program ||
                     item.program?._id === subjectForm.program)
            )
            .map((item) => item.level)
      ),
   ];
   const assignmentClasses = catalog.classes.filter(
      (item) =>
         (!assignmentForm.academicYear ||
            item.academicYear?._id === assignmentForm.academicYear) &&
         (!assignmentForm.program ||
            item.program?._id === assignmentForm.program)
   );
   const activeSubjects = catalog.subjects.filter((item) => item.isActive);

   return (
      <section className="studies-workspace">
         {error && !activeForm && !gradeReviewTarget && !evaluationToClose && (
            <p className="alert alert-error">{error}</p>
         )}
         {notice && <p className="alert alert-success">{notice}</p>}
         <div className="panel pedagogy-launcher">
            <div className="pedagogy-launcher-heading">
               <div>
                  <p className="eyebrow">PÉDAGOGIE</p>
                  <h3>Que souhaitez-vous gérer ?</h3>
                  <p className="muted">
                     Accédez directement aux réglages et aux créations
                     pédagogiques.
                  </p>
               </div>
               <span className="pedagogy-action-count">5 actions</span>
            </div>
            <div className="pedagogy-action-grid">
               <button
                  className="pedagogy-action"
                  onClick={() => setActiveForm('teacher')}>
                  <span className="pedagogy-action-icon">＋</span>
                  <span className="pedagogy-action-copy">
                     <strong>Enseignant</strong>
                     <small>Créer un compte enseignant</small>
                  </span>
                  <span className="pedagogy-action-arrow">↗</span>
               </button>
               <button
                  className="pedagogy-action"
                  onClick={() => {
                     setActiveDataView('subjects');
                     setActiveForm('subject');
                  }}>
                  <span className="pedagogy-action-icon">▤</span>
                  <span className="pedagogy-action-copy">
                     <strong>Matière</strong>
                     <small>Ajouter une matière</small>
                  </span>
                  <span className="pedagogy-action-arrow">↗</span>
               </button>
               <button
                  className="pedagogy-action"
                  onClick={() => {
                     setActiveDataView('settings');
                     setActiveForm('globalSettings');
                  }}>
                  <span className="pedagogy-action-icon">∑</span>
                  <span className="pedagogy-action-copy">
                     <strong>Règles générales</strong>
                     <small>Barème, seuil et calcul communs</small>
                  </span>
                  <span className="pedagogy-action-arrow">↗</span>
               </button>
               <button
                  className="pedagogy-action"
                  onClick={() => setActiveForm('assignment')}>
                  <span className="pedagogy-action-icon">⇄</span>
                  <span className="pedagogy-action-copy">
                     <strong>Affectation</strong>
                     <small>Associer enseignant et classe</small>
                  </span>
                  <span className="pedagogy-action-arrow">↗</span>
               </button>
               <button
                  className="pedagogy-action pedagogy-action-primary"
                  onClick={() => {
                     setActiveDataView('evaluations');
                     setActiveForm('evaluation');
                  }}>
                  <span className="pedagogy-action-icon">✓</span>
                  <span className="pedagogy-action-copy">
                     <strong>Évaluation</strong>
                     <small>Créer une nouvelle évaluation</small>
                  </span>
                  <span className="pedagogy-action-arrow">↗</span>
               </button>
            </div>
         </div>
         {activeForm && activeForm !== 'evaluation' && (
            <ModalDialog
               eyebrow="GESTION PÉDAGOGIQUE"
               title={
                  {
                     teacher: 'Créer un enseignant',
                     subject: 'Créer une matière',
                     globalSettings: 'Règles générales',
                     assignment: 'Affecter un enseignant',
                  }[activeForm]
               }
               onClose={() => setActiveForm('')}>
               {error && <p className="alert alert-error">{error}</p>}
               <div
                  className="content-grid study-form-modal"
                  data-active-form={activeForm}>
                  <div className="panel" data-form="teacher">
                     <div className="panel-heading">
                        <div>
                           <p className="eyebrow">ÉQUIPE PÉDAGOGIQUE</p>
                           <h3>Créer un enseignant</h3>
                        </div>
                     </div>
                     <form
                        className="form-grid one-column"
                        onSubmit={createTeacher}>
                        <label>
                           Prénom
                           <input
                              value={teacherForm.firstName}
                              onChange={(event) =>
                                 setTeacherForm({
                                    ...teacherForm,
                                    firstName: event.target.value,
                                 })
                              }
                              required
                           />
                        </label>
                        <label>
                           Nom
                           <input
                              value={teacherForm.lastName}
                              onChange={(event) =>
                                 setTeacherForm({
                                    ...teacherForm,
                                    lastName: event.target.value,
                                 })
                              }
                              required
                           />
                        </label>
                        <label>
                           Email
                           <input
                              type="email"
                              value={teacherForm.email}
                              onChange={(event) =>
                                 setTeacherForm({
                                    ...teacherForm,
                                    email: event.target.value,
                                 })
                              }
                              required
                           />
                        </label>
                        <label>
                           Numéro de téléphone
                           <input
                              type="tel"
                              autoComplete="tel"
                              maxLength={30}
                              placeholder="Indicatif pays et numéro"
                              value={teacherForm.phone}
                              onChange={(event) =>
                                 setTeacherForm({
                                    ...teacherForm,
                                    phone: event.target.value,
                                 })
                              }
                              required
                           />
                        </label>
                        {teacherTemporaryPassword && (
                           <p className="alert alert-success">
                              Mot de passe temporaire :{' '}
                              <code className="temporary-password">
                                 {teacherTemporaryPassword}
                              </code>
                           </p>
                        )}
                        <button
                           className="button button-primary"
                           disabled={busy}>
                           Créer le compte
                        </button>
                     </form>
                  </div>
                  <div className="panel" data-form="subject">
                     <div className="panel-heading">
                        <div>
                           <p className="eyebrow">RÉFÉRENTIEL</p>
                           <h3>Créer une matière</h3>
                        </div>
                     </div>
                     <form
                        className="form-grid one-column"
                        onSubmit={createSubject}>
                        <label>
                           Nom
                           <input
                              value={subjectForm.name}
                              onChange={(event) =>
                                 setSubjectForm({
                                    ...subjectForm,
                                    name: event.target.value,
                                 })
                              }
                              required
                           />
                        </label>
                        <label>
                           Code
                           <input
                              value={subjectForm.code}
                              onChange={(event) =>
                                 setSubjectForm({
                                    ...subjectForm,
                                    code: event.target.value,
                                 })
                              }
                              required
                           />
                        </label>
                        <label>
                           Description
                           <input
                              value={subjectForm.description}
                              onChange={(event) =>
                                 setSubjectForm({
                                    ...subjectForm,
                                    description: event.target.value,
                                 })
                              }
                           />
                        </label>
                        <label>
                           Année
                           <select
                              value={subjectForm.academicYear}
                              onChange={(event) =>
                                 setSubjectForm({
                                    ...subjectForm,
                                    academicYear: event.target.value,
                                    level: '',
                                 })
                              }
                              required>
                              <option value="">Choisir</option>
                              {catalog.years
                                 .filter((year) => year.status !== 'CLOSED')
                                 .map((year) => (
                                    <option key={year._id} value={year._id}>
                                       {year.label}
                                    </option>
                                 ))}
                           </select>
                        </label>
                        <label>
                           Programme
                           <select
                              value={subjectForm.program}
                              onChange={(event) =>
                                 setSubjectForm({
                                    ...subjectForm,
                                    program: event.target.value,
                                    level: '',
                                 })
                              }
                              required>
                              <option value="">Choisir</option>
                              {catalog.programs.map((item) => (
                                 <option key={item._id} value={item._id}>
                                    {item.name}
                                 </option>
                              ))}
                           </select>
                        </label>
                        <label>
                           Niveau
                           <select
                              value={subjectForm.level}
                              onChange={(event) =>
                                 setSubjectForm({
                                    ...subjectForm,
                                    level: event.target.value,
                                 })
                              }
                              required>
                              <option value="">Choisir</option>
                              {levels.map((level) => (
                                 <option key={level}>{level}</option>
                              ))}
                           </select>
                        </label>
                        <label>
                           Module
                           <select
                              value={subjectForm.module}
                              onChange={(event) =>
                                 setSubjectForm({
                                    ...subjectForm,
                                    module: event.target.value,
                                 })
                              }
                              required>
                              <option value="MODULE_1">Premier module</option>
                              <option value="MODULE_2">Deuxième module</option>
                           </select>
                        </label>
                        <label>
                           Coefficient
                           <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={subjectForm.coefficient}
                              onChange={(event) =>
                                 setSubjectForm({
                                    ...subjectForm,
                                    coefficient: event.target.value,
                                 })
                              }
                              required
                           />
                        </label>
                        <label>
                           Barème général appliqué
                           <input
                              value={
                                 catalog.globalSettings?.resultScale ??
                                 'À configurer dans le barème général'
                              }
                              readOnly
                           />
                        </label>
                        <label>
                           Calcul des évaluations
                           <select
                              value={subjectForm.evaluationMethod}
                              onChange={(event) =>
                                 setSubjectForm({
                                    ...subjectForm,
                                    evaluationMethod: event.target.value,
                                 })
                              }>
                              <option value="ARITHMETIC_MEAN">
                                 Moyenne arithmétique
                              </option>
                              <option value="WEIGHTED_MEAN">
                                 Moyenne pondérée
                              </option>
                           </select>
                        </label>
                        <fieldset className="form-grid one-column">
                           <legend>Pondération des composantes</legend>
                           <div className="form-grid">
                              {[
                                 ['oralWeight', 'Oral'],
                                 ['writtenWeight', 'Écrit'],
                                 ['compositionWeight', 'Composition'],
                              ].map(([field, label]) => (
                                 <label key={field}>
                                    {label}
                                    <input
                                       type="number"
                                       min="0.01"
                                       step="any"
                                       value={subjectForm[field]}
                                       onChange={(event) =>
                                          setSubjectForm({
                                             ...subjectForm,
                                             [field]: event.target.value,
                                          })
                                       }
                                       required
                                    />
                                 </label>
                              ))}
                           </div>
                        </fieldset>
                        <button
                           className="button button-primary"
                           disabled={busy}>
                           Créer la matière et ses paramètres
                        </button>
                     </form>
                  </div>
                  <div className="panel" data-form="globalSettings">
                     <div className="panel-heading">
                        <div>
                           <p className="eyebrow">ÉTABLISSEMENT</p>
                           <h3>Barème commun à tous les niveaux</h3>
                        </div>
                     </div>
                     <form
                        className="form-grid one-column"
                        onSubmit={(event) => {
                           event.preventDefault();
                           act(
                              '/academic-settings',
                              'PUT',
                              {
                                 resultScale: Number(
                                    globalSettingsForm.resultScale
                                 ),
                                 admissionThreshold: Number(
                                    globalSettingsForm.admissionThreshold
                                 ),
                                 calculationRules: {
                                    overallMethod:
                                       globalSettingsForm.overallMethod,
                                 },
                              },
                              'Règles générales enregistrées pour tout l’établissement.'
                           );
                        }}>
                        <p className="form-note">
                           Cette valeur unique s’applique à toutes les matières,
                           tous les programmes et tous les niveaux.
                        </p>
                        <label>
                           Barème général
                           <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={globalSettingsForm.resultScale}
                              onChange={(event) =>
                                 setGlobalSettingsForm({
                                    ...globalSettingsForm,
                                    resultScale: event.target.value,
                                 })
                              }
                              required
                           />
                        </label>
                        <label>
                           Seuil d’admission
                           <input
                              type="number"
                              min="0"
                              step="any"
                              value={globalSettingsForm.admissionThreshold}
                              onChange={(event) =>
                                 setGlobalSettingsForm({
                                    ...globalSettingsForm,
                                    admissionThreshold: event.target.value,
                                 })
                              }
                              required
                           />
                        </label>
                        <label>
                           Calcul de la moyenne générale
                           <select
                              value={globalSettingsForm.overallMethod}
                              onChange={(event) =>
                                 setGlobalSettingsForm({
                                    ...globalSettingsForm,
                                    overallMethod: event.target.value,
                                 })
                              }
                              required>
                              <option value="WEIGHTED_MEAN">
                                 Moyenne pondérée par les coefficients
                              </option>
                              <option value="ARITHMETIC_MEAN">
                                 Moyenne arithmétique des matières
                              </option>
                           </select>
                        </label>
                        <p className="form-note">
                           Pour un rattrapage validé, la moyenne finale est la
                           moyenne entre la moyenne générale et la moyenne des
                           notes de rattrapage.
                        </p>
                        <button
                           className="button button-primary"
                           disabled={busy}>
                           Enregistrer les règles générales
                        </button>
                     </form>
                  </div>
                  <div className="panel" data-form="assignment">
                     <div className="panel-heading">
                        <div>
                           <p className="eyebrow">RESPONSABILITÉS</p>
                           <h3>Affecter un enseignant</h3>
                        </div>
                     </div>
                     <form
                        className="form-grid one-column"
                        onSubmit={(event) => {
                           event.preventDefault();
                           act(
                              '/teaching-assignments',
                              'POST',
                              assignmentForm,
                              'Affectation créée.'
                           );
                        }}>
                        <label>
                           Enseignant · nom et adresse e-mail
                           <select
                              value={assignmentForm.teacher}
                              onChange={(event) =>
                                 setAssignmentForm({
                                    ...assignmentForm,
                                    teacher: event.target.value,
                                 })
                              }
                              required>
                              <option value="">Choisir</option>
                              {catalog.teachers.map((item) => (
                                 <option key={item._id} value={item._id}>
                                    {item.firstName} {item.lastName} ·{' '}
                                    {item.email}
                                 </option>
                              ))}
                           </select>
                        </label>
                        <label>
                           Année
                           <select
                              value={assignmentForm.academicYear}
                              onChange={(event) =>
                                 setAssignmentForm({
                                    ...assignmentForm,
                                    academicYear: event.target.value,
                                    class: '',
                                 })
                              }
                              required>
                              <option value="">Choisir</option>
                              {catalog.years
                                 .filter((year) => year.status !== 'CLOSED')
                                 .map((year) => (
                                    <option key={year._id} value={year._id}>
                                       {year.label}
                                    </option>
                                 ))}
                           </select>
                        </label>
                        <label>
                           Programme
                           <select
                              value={assignmentForm.program}
                              onChange={(event) =>
                                 setAssignmentForm({
                                    ...assignmentForm,
                                    program: event.target.value,
                                    class: '',
                                 })
                              }
                              required>
                              <option value="">Choisir</option>
                              {catalog.programs.map((item) => (
                                 <option key={item._id} value={item._id}>
                                    {item.name}
                                 </option>
                              ))}
                           </select>
                        </label>
                        <label>
                           Classe
                           <select
                              value={assignmentForm.class}
                              onChange={(event) =>
                                 setAssignmentForm({
                                    ...assignmentForm,
                                    class: event.target.value,
                                 })
                              }
                              required>
                              <option value="">Choisir</option>
                              {assignmentClasses.map((item) => (
                                 <option key={item._id} value={item._id}>
                                    {item.name} · {item.level}
                                 </option>
                              ))}
                           </select>
                        </label>
                        <label>
                           Matière
                           <select
                              value={assignmentForm.subject}
                              onChange={(event) =>
                                 setAssignmentForm({
                                    ...assignmentForm,
                                    subject: event.target.value,
                                 })
                              }
                              required>
                              <option value="">Choisir</option>
                              {activeSubjects.map((item) => (
                                 <option key={item._id} value={item._id}>
                                    {item.name}
                                 </option>
                              ))}
                           </select>
                        </label>
                        <button
                           className="button button-primary"
                           disabled={busy}>
                           Créer l’affectation
                        </button>
                     </form>
                  </div>
               </div>
            </ModalDialog>
         )}

         <ManagementTabs
            label="Gestion pédagogique"
            active={activeDataView}
            onChange={setActiveDataView}
            tabs={[
               {
                  id: 'evaluations',
                  label: 'Évaluations',
                  count: catalog.evaluations.length,
               },
               {
                  id: 'grades',
                  label: 'Notes à contrôler',
                  count: grades.length,
               },
               {
                  id: 'subjects',
                  label: 'Matières',
                  count: catalog.subjects.length,
               },
               {
                  id: 'configurations',
                  label: 'Paramètres matière',
                  count: catalog.configurations.length,
               },
               {
                  id: 'settings',
                  label: 'Règles générales',
                  count: catalog.globalSettings ? 1 : 0,
               },
            ]}
         />
         <div className="content-grid study-data-grid">
            <details
               className="panel data-disclosure"
               open={activeDataView === 'subjects'}>
               <summary>
                  <span>Matières</span>
                  <small>
                     {catalog.subjects.length} élément
                     {catalog.subjects.length === 1 ? '' : 's'}
                  </small>
               </summary>
               <div className="disclosure-content">
                  <div className="panel-heading">
                     <div>
                        <p className="eyebrow">CATALOGUE</p>
                        <h3>Matières</h3>
                     </div>
                  </div>
                  <div className="table-wrap">
                     <table>
                        <thead>
                           <tr>
                              <th>Matière</th>
                              <th>Code</th>
                              <th>Statut</th>
                              <th />
                           </tr>
                        </thead>
                        <tbody>
                           {catalog.subjects.map((subject) => (
                              <tr key={subject._id}>
                                 <td>{subject.name}</td>
                                 <td>{subject.code}</td>
                                 <td>
                                    <span
                                       className={`status-pill ${subject.isActive ? 'status-active' : 'status-muted'}`}>
                                       {subject.isActive
                                          ? 'Active'
                                          : 'Inactive'}
                                    </span>
                                 </td>
                                 <td>
                                    <button
                                       className="text-button"
                                       disabled={busy}
                                       onClick={() =>
                                          act(
                                             `/subjects/${subject._id}`,
                                             'PATCH',
                                             { isActive: !subject.isActive },
                                             subject.isActive
                                                ? 'Matière désactivée.'
                                                : 'Matière activée.'
                                          )
                                       }>
                                       {subject.isActive
                                          ? 'Désactiver'
                                          : 'Activer'}
                                    </button>
                                 </td>
                              </tr>
                           ))}
                           {!catalog.subjects.length && (
                              <tr>
                                 <td colSpan="4" className="empty-cell">
                                    Aucune matière.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </details>
            <details
               className="panel data-disclosure"
               open={activeDataView === 'configurations'}>
               <summary>
                  <span>Paramètres des matières</span>
                  <small>
                     {catalog.configurations.length} configuration
                     {catalog.configurations.length === 1 ? '' : 's'}
                  </small>
               </summary>
               <div className="disclosure-content">
                  <div className="panel-heading">
                     <div>
                        <p className="eyebrow">CATALOGUE</p>
                        <h3>Paramètres des matières</h3>
                     </div>
                  </div>
                  <div className="table-wrap">
                     <table>
                        <thead>
                           <tr>
                              <th>Année · programme</th>
                              <th>Niveau · matière</th>
                              <th>Coefficient</th>
                              <th>Barème général</th>
                              <th>Calcul des évaluations</th>
                              <th>Poids oral · écrit · composition</th>
                           </tr>
                        </thead>
                        <tbody>
                           {catalog.configurations.map((configuration) => (
                              <tr key={configuration._id}>
                                 <td>
                                    {configuration.academicYear?.label} ·{' '}
                                    {configuration.program?.name}
                                 </td>
                                 <td>
                                    {configuration.level} ·{' '}
                                    {configuration.subject?.name}
                                 </td>
                                 <td>{configuration.coefficient}</td>
                                 <td>
                                    {catalog.globalSettings?.resultScale ?? '—'}
                                 </td>
                                 <td>
                                    {configuration.calculationRules
                                       ?.evaluationMethod === 'WEIGHTED_MEAN'
                                       ? 'Pondérée'
                                       : 'Arithmétique'}
                                 </td>
                                 <td>
                                    {[
                                       configuration.calculationRules
                                          ?.componentWeights?.oral ?? 1,
                                       configuration.calculationRules
                                          ?.componentWeights?.written ?? 1,
                                       configuration.calculationRules
                                          ?.componentWeights?.composition ?? 1,
                                    ].join(' · ')}
                                 </td>
                              </tr>
                           ))}
                           {!catalog.configurations.length && (
                              <tr>
                                 <td colSpan="6" className="empty-cell">
                                    Aucune configuration enregistrée.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </details>
            <details
               className="panel data-disclosure"
               open={activeDataView === 'settings'}>
               <summary>
                  <span>Règles générales</span>
                  <small>
                     {catalog.globalSettings ? '1 paramètre' : 'Non configuré'}
                  </small>
               </summary>
               <div className="disclosure-content">
                  <div className="panel-heading">
                     <div>
                        <p className="eyebrow">CATALOGUE</p>
                        <h3>Barème et règles communs</h3>
                     </div>
                  </div>
                  <p className="form-note">
                     Ce réglage s’applique à toutes les classes, tous les
                     programmes et tous les niveaux.
                  </p>
                  <div className="table-wrap">
                     <table>
                        <thead>
                           <tr>
                              <th>Barème général</th>
                              <th>Seuil</th>
                              <th>Calcul général</th>
                              <th />
                           </tr>
                        </thead>
                        <tbody>
                           {catalog.globalSettings ? (
                              <tr>
                                 <td>{catalog.globalSettings.resultScale}</td>
                                 <td>
                                    {catalog.globalSettings.admissionThreshold}
                                 </td>
                                 <td>
                                    {catalog.globalSettings.calculationRules
                                       ?.overallMethod === 'ARITHMETIC_MEAN'
                                       ? 'Arithmétique'
                                       : 'Pondérée'}
                                 </td>
                                 <td>
                                    <button
                                       className="text-button"
                                       onClick={() =>
                                          setActiveForm('globalSettings')
                                       }>
                                       Modifier
                                    </button>
                                 </td>
                              </tr>
                           ) : (
                              <tr>
                                 <td colSpan="4" className="empty-cell">
                                    Les règles générales ne sont pas
                                    configurées.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </details>
         </div>

         {activeForm === 'evaluation' && (
            <ModalDialog
               eyebrow="ÉVALUATIONS"
               title="Créer une évaluation"
               onClose={() => setActiveForm('')}>
               <div className="panel">
                  {error && <p className="alert alert-error">{error}</p>}
                  <div className="panel-heading">
                     <div>
                        <p className="eyebrow">ÉVALUATIONS</p>
                        <h3>Créer une évaluation</h3>
                     </div>
                  </div>
                  <form
                     className="form-grid"
                     onSubmit={(event) => {
                        event.preventDefault();
                        act(
                           '/evaluations',
                           'POST',
                           {
                              ...evaluationForm,
                              weight: Number(evaluationForm.weight),
                           },
                           'Évaluation créée avec le barème général.'
                        );
                     }}>
                     <label>
                        Affectation
                        <select
                           value={evaluationForm.assignment}
                           onChange={(event) =>
                              setEvaluationForm({
                                 ...evaluationForm,
                                 assignment: event.target.value,
                              })
                           }
                           required>
                           <option value="">Choisir</option>
                           {catalog.assignments.map((item) => (
                              <option key={item._id} value={item._id}>
                                 {item.subject?.name} · {item.class?.name} ·{' '}
                                 {item.teacher?.firstName}{' '}
                                 {item.teacher?.lastName} ·{' '}
                                 {item.teacher?.email}
                              </option>
                           ))}
                        </select>
                     </label>
                     <label>
                        Nom
                        <input
                           value={evaluationForm.name}
                           onChange={(event) =>
                              setEvaluationForm({
                                 ...evaluationForm,
                                 name: event.target.value,
                              })
                           }
                           required
                        />
                     </label>
                     <label>
                        Type d’évaluation
                        <select
                           value={evaluationForm.type}
                           onChange={(event) =>
                              setEvaluationForm({
                                 ...evaluationForm,
                                 type: event.target.value,
                              })
                           }>
                           <option value="NORMAL">Évaluation principale</option>
                           <option value="RETAKE">Rattrapage</option>
                        </select>
                     </label>
                     <label>
                        Module
                        <select
                           value={evaluationForm.period}
                           onChange={(event) =>
                              setEvaluationForm({
                                 ...evaluationForm,
                                 period: event.target.value,
                              })
                           }
                           required>
                           <option value="MODULE_1">Premier module</option>
                           <option value="MODULE_2">Deuxième module</option>
                        </select>
                     </label>
                     <label>
                        Poids
                        <input
                           type="number"
                           min="0.01"
                           step="any"
                           value={evaluationForm.weight}
                           onChange={(event) =>
                              setEvaluationForm({
                                 ...evaluationForm,
                                 weight: event.target.value,
                              })
                           }
                           required
                        />
                     </label>
                     <p className="form-note span-2 evaluation-structure-note">
                        Chaque module comprend une évaluation principale et peut
                        avoir son propre rattrapage.
                     </p>
                     <button className="button button-primary" disabled={busy}>
                        Créer l’évaluation
                     </button>
                  </form>
               </div>
            </ModalDialog>
         )}

         <details
            className="panel data-disclosure"
            open={activeDataView === 'evaluations'}>
            <summary>
               <span>Évaluations · suivi et clôture</span>
               <small>
                  {catalog.evaluations.length} évaluation
                  {catalog.evaluations.length === 1 ? '' : 's'}
               </small>
            </summary>
            <div className="disclosure-content">
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">CATALOGUE</p>
                     <h3>Évaluations · suivi et clôture</h3>
                  </div>
               </div>
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Évaluation</th>
                           <th>Enseignant</th>
                           <th>Classe</th>
                           <th>Statut</th>
                           <th>Action</th>
                        </tr>
                     </thead>
                     <tbody>
                        {catalog.evaluations.map((item) => (
                           <tr key={item._id}>
                              <td>
                                 {formatEvaluationPeriod(item.period)} ·{' '}
                                 {formatEvaluationType(item.type)}
                                 <small className="table-subtitle">
                                    {item.name}
                                 </small>
                              </td>
                              <td>
                                 {item.assignment?.teacher?.firstName}{' '}
                                 {item.assignment?.teacher?.lastName}
                                 <small className="table-subtitle">
                                    {item.assignment?.teacher?.email}
                                 </small>
                              </td>
                              <td>{item.assignment?.class?.name}</td>
                              <td>
                                 <span
                                    className={`status-pill ${item.status === 'OPEN' ? 'status-active' : 'status-muted'}`}>
                                    {formatEvaluationStatus(item.status)}
                                 </span>
                              </td>
                              <td>
                                 {item.status === 'OPEN' ? (
                                    <button
                                       className="text-button danger-text"
                                       disabled={busy}
                                       onClick={() => closeEvaluation(item)}>
                                       Clôturer
                                    </button>
                                 ) : (
                                    <span className="muted">Clôturée</span>
                                 )}
                              </td>
                           </tr>
                        ))}
                        {!catalog.evaluations.length && (
                           <tr>
                              <td colSpan="5" className="empty-cell">
                                 Aucune évaluation.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </details>

         <details
            className="panel data-disclosure"
            open={activeDataView === 'grades'}>
            <summary>
               <span>Notes à contrôler</span>
               <small>
                  {grades.length} note{grades.length === 1 ? '' : 's'}
               </small>
            </summary>
            <div className="disclosure-content">
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">SUIVI DES NOTES</p>
                     <h3>Contrôler les notes</h3>
                     <p className="muted">
                        Choisissez une évaluation, vérifiez les notes soumises,
                        puis validez-les ou demandez une correction. Une note
                        validée peut ensuite être verrouillée.
                     </p>
                  </div>
               </div>
               <div
                  className="grade-workflow-summary"
                  aria-label="État des notes">
                  {gradeCounts.map(({ status, count }) => (
                     <button
                        type="button"
                        key={status}
                        className={
                           gradeStatusFilter === status ? 'selected' : ''
                        }
                        aria-pressed={gradeStatusFilter === status}
                        disabled={!selectedEvaluation || gradeLoading}
                        onClick={() => setGradeStatusFilter(status)}>
                        <strong>{count}</strong>
                        <span>{formatGradeStatus(status)}</span>
                     </button>
                  ))}
               </div>
               <details className="grade-filter-panel">
                  <summary>
                     <span>Affiner les évaluations</span>
                     <small>
                        {activeGradeFilterCount
                           ? `${activeGradeFilterCount} filtre${activeGradeFilterCount > 1 ? 's' : ''} actif${activeGradeFilterCount > 1 ? 's' : ''}`
                           : `${catalog.evaluations.length} évaluations disponibles`}
                     </small>
                  </summary>
                  <div className="grade-filter-grid">
                     <label>
                        Classe
                        <select
                           value={gradeClassFilter}
                           onChange={(event) => {
                              setGradeClassFilter(event.target.value);
                              loadGrades('');
                           }}>
                           <option value="">Toutes les classes</option>
                           {gradeFilterClasses.map((item) => (
                              <option key={item._id} value={item._id}>
                                 {item.name} · {item.level || 'Niveau'}
                              </option>
                           ))}
                        </select>
                     </label>
                     <label>
                        Module
                        <select
                           value={gradeModuleFilter}
                           onChange={(event) => {
                              setGradeModuleFilter(event.target.value);
                              loadGrades('');
                           }}>
                           <option value="">Tous les modules</option>
                           <option value="MODULE_1">Module 1</option>
                           <option value="MODULE_2">Module 2</option>
                        </select>
                     </label>
                     <label>
                        Matière
                        <select
                           value={gradeSubjectFilter}
                           onChange={(event) => {
                              setGradeSubjectFilter(event.target.value);
                              loadGrades('');
                           }}>
                           <option value="">Toutes les matières</option>
                           {gradeFilterSubjects.map((item) => (
                              <option key={item._id} value={item._id}>
                                 {item.name}
                              </option>
                           ))}
                        </select>
                     </label>
                     <label>
                        Enseignant
                        <select
                           value={gradeTeacherFilter}
                           onChange={(event) => {
                              setGradeTeacherFilter(event.target.value);
                              loadGrades('');
                           }}>
                           <option value="">Tous les enseignants</option>
                           {gradeFilterTeachers.map((item) => (
                              <option key={item._id} value={item._id}>
                                 {item.firstName} {item.lastName} · {item.email}
                              </option>
                           ))}
                        </select>
                     </label>
                  </div>
               </details>
               <label className="study-grade-select">
                  Évaluation
                  <select
                     className="evaluation-select"
                     value={selectedEvaluation}
                     onChange={(event) => loadGrades(event.target.value)}>
                     <option value="">Choisir une évaluation</option>
                     {filteredGradeEvaluations.map((item) => (
                        <option key={item._id} value={item._id}>
                           {item.assignment?.class?.name || 'Classe'} ·{' '}
                           {item.assignment?.subject?.name || 'Matière'} ·{' '}
                           {formatEvaluationPeriod(item.period)} ·{' '}
                           {formatEvaluationType(item.type)} · {item.name}
                        </option>
                     ))}
                  </select>
               </label>
               <MatriculeFilter
                  id="studies-grade-matricule"
                  value={gradeMatriculeFilter}
                  onChange={setGradeMatriculeFilter}
                  count={visibleGrades.length}
                  total={statusFilteredGrades.length}
               />
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Élève</th>
                           <th>Oral</th>
                           <th>Écrit</th>
                           <th>Composition</th>
                           <th>Moyenne</th>
                           <th>État</th>
                           <th>Contrôle</th>
                        </tr>
                     </thead>
                     <tbody>
                        {visibleGrades.map((grade) => (
                           <tr key={grade._id}>
                              <td>
                                 {grade.enrollment?.student?.matricule} ·{' '}
                                 {grade.enrollment?.student?.firstName}{' '}
                                 {grade.enrollment?.student?.lastName}
                              </td>
                              <td>{grade.components?.oral ?? '—'}</td>
                              <td>{grade.components?.written ?? '—'}</td>
                              <td>{grade.components?.composition ?? '—'}</td>
                              <td>{grade.score ?? '—'}</td>
                              <td>
                                 <span
                                    className={`status-pill ${gradeStatusClass(grade.status)}`}>
                                    {formatGradeStatus(grade.status)}
                                 </span>
                              </td>
                              <td>
                                 {grade.status === 'SUBMITTED' ? (
                                    <div className="table-actions">
                                       <button
                                          className="text-button"
                                          disabled={busyGradeId === grade._id}
                                          onClick={() =>
                                             review(grade, 'VALIDATED')
                                          }>
                                          {busyGradeId === grade._id
                                             ? 'Traitement…'
                                             : 'Valider la note'}
                                       </button>
                                       <button
                                          className="text-button danger-text"
                                          disabled={busyGradeId === grade._id}
                                          onClick={() =>
                                             review(grade, 'NEEDS_CORRECTION')
                                          }>
                                          Demander une correction
                                       </button>
                                    </div>
                                 ) : grade.status === 'VALIDATED' ? (
                                    <button
                                       className="text-button"
                                       disabled={busyGradeId === grade._id}
                                       onClick={() => lock(grade)}>
                                       {busyGradeId === grade._id
                                          ? 'Traitement…'
                                          : 'Verrouiller la note'}
                                    </button>
                                 ) : grade.status === 'LOCKED' ? (
                                    <button
                                       className="text-button danger-text"
                                       disabled={busyGradeId === grade._id}
                                       onClick={() => {
                                          setGradeReviewTarget(grade);
                                          setGradeReviewReason('');
                                       }}>
                                       Demander une modification
                                    </button>
                                 ) : (
                                    <span className="muted">—</span>
                                 )}
                              </td>
                           </tr>
                        ))}
                        {!visibleGrades.length && (
                           <tr>
                              <td colSpan="7" className="empty-cell">
                                 {gradeLoading
                                    ? 'Chargement des notes…'
                                    : !selectedEvaluation
                                      ? 'Choisissez une évaluation pour afficher les notes à contrôler.'
                                      : statusFilteredGrades.length
                                        ? 'Aucun élève ne correspond à ce matricule.'
                                        : `Aucune note au statut « ${formatGradeStatus(gradeStatusFilter).toLocaleLowerCase('fr')} » pour cette évaluation.`}
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </details>
         {gradeReviewTarget && (
            <ModalDialog
               eyebrow="CONTRÔLE DES NOTES"
               title={
                  gradeReviewTarget.status === 'LOCKED'
                     ? 'Demander une modification'
                     : 'Demander une correction'
               }
               onClose={() => setGradeReviewTarget(null)}>
               {error && <p className="alert alert-error">{error}</p>}
               <form
                  className="form-grid one-column"
                  onSubmit={(event) => {
                     event.preventDefault();
                     if (!gradeReviewReason.trim()) {
                        setError(
                           'Le motif de correction ne peut pas être vide.'
                        );
                        return;
                     }
                     if (gradeReviewTarget.status === 'LOCKED') {
                        requestGradeModification(
                           gradeReviewTarget,
                           gradeReviewReason.trim()
                        );
                        return;
                     }
                     review(
                        gradeReviewTarget,
                        'NEEDS_CORRECTION',
                        gradeReviewReason.trim()
                     );
                  }}>
                  <p className="muted">
                     Élève : {gradeReviewTarget.enrollment?.student?.firstName}{' '}
                     {gradeReviewTarget.enrollment?.student?.lastName} ·{' '}
                     {gradeReviewTarget.enrollment?.student?.matricule}
                  </p>
                  <label>
                     Motif obligatoire
                     <textarea
                        value={gradeReviewReason}
                        onChange={(event) =>
                           setGradeReviewReason(event.target.value)
                        }
                        maxLength="500"
                        rows="4"
                        required
                     />
                  </label>
                  <div className="modal-actions">
                     <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setGradeReviewTarget(null)}>
                        Annuler
                     </button>
                     <button className="button button-primary">
                        {gradeReviewTarget.status === 'LOCKED'
                           ? 'Envoyer la demande'
                           : 'Envoyer le motif'}
                     </button>
                  </div>
               </form>
            </ModalDialog>
         )}
         {evaluationToClose && (
            <ModalDialog
               eyebrow="ÉVALUATIONS"
               title="Clôturer cette évaluation ?"
               onClose={() => setEvaluationToClose(null)}>
               {error && <p className="alert alert-error">{error}</p>}
               <p className="muted">
                  L’évaluation « {evaluationToClose.name} » ne pourra plus
                  recevoir de nouvelles notes.
               </p>
               <div className="modal-actions">
                  <button
                     className="button button-secondary"
                     onClick={() => setEvaluationToClose(null)}>
                     Annuler
                  </button>
                  <button
                     className="button button-primary"
                     onClick={confirmCloseEvaluation}>
                     Clôturer
                  </button>
               </div>
            </ModalDialog>
         )}
      </section>
   );
}

const compareResultsByClassAndMerit = (first, second, module = 'ALL') => {
   const classNameDelta =
      `${first.class?.name || ''} ${first.class?.level || ''}`.localeCompare(
         `${second.class?.name || ''} ${second.class?.level || ''}`,
         'fr',
         { sensitivity: 'base' }
      );
   if (classNameDelta !== 0) return classNameDelta;
   const firstScore =
      module === 'ALL' ? first.average : first.modules?.[module];
   const secondScore =
      module === 'ALL' ? second.average : second.modules?.[module];
   if (Number.isFinite(firstScore) || Number.isFinite(secondScore)) {
      if (!Number.isFinite(firstScore)) return 1;
      if (!Number.isFinite(secondScore)) return -1;
      const averageDelta = secondScore - firstScore;
      if (averageDelta !== 0) return averageDelta;
   }
   return `${first.student?.lastName || ''} ${first.student?.firstName || ''}`.localeCompare(
      `${second.student?.lastName || ''} ${second.student?.firstName || ''}`,
      'fr',
      { sensitivity: 'base' }
   );
};

const gradeStatusLabels = GRADE_STATUS_LABELS;

const resultHasEnteredGrades = (result) =>
   result.subjects?.some((subject) =>
      subject.evaluations?.some((evaluation) =>
         Number.isFinite(evaluation.score)
      )
   ) ?? false;

const formatScaledResult = (score, scale) =>
   Number.isFinite(score) ? `${score.toFixed(2)} / ${scale || '—'}` : '—';

function ResultsBoardPanel({
   token,
   role,
   assignments = [],
   academicYears = [],
}) {
   const [years, setYears] = useState(academicYears);
   const [classes, setClasses] = useState([]);
   const [enrollments, setEnrollments] = useState([]);
   const [results, setResults] = useState([]);
   const [selectedYearId, setSelectedYearId] = useState('');
   const [selectedClassId, setSelectedClassId] = useState('');
   const [moduleFilter, setModuleFilter] = useState('ALL');
   const [studentSearch, setStudentSearch] = useState('');
   const [selectedResult, setSelectedResult] = useState(null);
   const [loading, setLoading] = useState(true);
   const [isFinalizing, setIsFinalizing] = useState(false);
   const [refreshKey, setRefreshKey] = useState(0);
   const [notice, setNotice] = useState('');
   const [error, setError] = useState('');

   useEffect(() => {
      let active = true;
      if (role === 'ENSEIGNANT') {
         setYears(academicYears);
         if (academicYears.length && !selectedYearId) {
            const activeYear =
               academicYears.find((year) => year.status === 'ACTIVE') ||
               academicYears[0];
            setSelectedYearId(activeYear._id);
         }
         setClasses([]);
         setEnrollments([]);
         setLoading(false);
         return () => {
            active = false;
         };
      }
      Promise.all([
         apiRequest('/academic-years', { token }),
         apiRequest('/classes', { token }),
         apiRequest('/enrollments?status=APPROVED', { token }),
      ])
         .then(([yearData, classData, enrollmentData]) => {
            if (!active) return;
            setYears(yearData);
            setClasses(classData);
            setEnrollments(enrollmentData);
            if (yearData.length && !selectedYearId) {
               const activeYear =
                  yearData.find((year) => year.status === 'ACTIVE') ||
                  yearData[0];
               setSelectedYearId(activeYear._id);
            }
         })
         .catch((requestError) => {
            if (active) setError(requestError.message);
         })
         .finally(() => {
            if (active) setLoading(false);
         });
      return () => {
         active = false;
      };
   }, [academicYears, role, selectedYearId, token]);

   const allowedClassIds = useMemo(() => {
      if (role === 'ENSEIGNANT') {
         return new Set(
            (assignments || [])
               .filter((assignment) => assignment.class?._id)
               .map((assignment) => assignment.class._id)
         );
      }
      return null;
   }, [assignments, role]);

   const visibleEnrollments = useMemo(() => {
      return enrollments.filter((enrollment) => {
         const classId = enrollment.class?._id;
         if (enrollment.status !== 'APPROVED') return false;
         if (selectedYearId && enrollment.academicYear?._id !== selectedYearId)
            return false;
         if (selectedClassId && classId !== selectedClassId) return false;
         if (allowedClassIds && (!classId || !allowedClassIds.has(classId)))
            return false;
         return true;
      });
   }, [allowedClassIds, enrollments, selectedClassId, selectedYearId]);

   useEffect(() => {
      if (role === 'ENSEIGNANT') {
         if (!selectedYearId) {
            setResults([]);
            setLoading(false);
            return undefined;
         }
         let active = true;
         setLoading(true);
         setError('');
         apiRequest(
            `/results/teacher?academicYear=${encodeURIComponent(selectedYearId)}`,
            { token }
         )
            .then((items) => {
               if (active)
                  setResults(
                     items
                        .filter(resultHasEnteredGrades)
                        .sort(compareResultsByClassAndMerit)
                  );
            })
            .catch((requestError) => {
               if (active) {
                  setResults([]);
                  setError(requestError.message);
               }
            })
            .finally(() => {
               if (active) setLoading(false);
            });
         return () => {
            active = false;
         };
      }
      if (!visibleEnrollments.length) {
         setResults([]);
         setLoading(false);
         return undefined;
      }
      let active = true;
      setLoading(true);
      Promise.all(
         visibleEnrollments.map((enrollment) =>
            apiRequest(`/results/enrollments/${enrollment._id}`, { token })
         )
      )
         .then((items) => {
            if (!active) return;
            const sorted = items
               .filter(resultHasEnteredGrades)
               .sort(compareResultsByClassAndMerit);
            setResults(sorted);
         })
         .catch((requestError) => {
            if (active) setError(requestError.message);
         })
         .finally(() => {
            if (active) setLoading(false);
         });
      return () => {
         active = false;
      };
   }, [refreshKey, role, selectedYearId, token, visibleEnrollments]);

   const availableClasses = useMemo(() => {
      if (role === 'ENSEIGNANT') {
         const classMap = new Map();
         results.forEach((result) => {
            if (result.class?._id) classMap.set(result.class._id, result.class);
         });
         return [...classMap.values()].sort((first, second) =>
            `${first.name} ${first.level}`.localeCompare(
               `${second.name} ${second.level}`,
               'fr',
               { sensitivity: 'base' }
            )
         );
      }
      const filteredClasses = classes.filter((schoolClass) => {
         const matchesYear =
            !selectedYearId || schoolClass.academicYear?._id === selectedYearId;
         if (!matchesYear) return false;
         if (
            allowedClassIds &&
            (!schoolClass._id || !allowedClassIds.has(schoolClass._id))
         )
            return false;
         return true;
      });
      return filteredClasses.sort((first, second) =>
         first.name.localeCompare(second.name, 'fr', { sensitivity: 'base' })
      );
   }, [allowedClassIds, classes, role, results, selectedYearId]);

   const scopedResults = results.filter(
      (result) => !selectedClassId || result.class?._id === selectedClassId
   );
   const rankedResults = scopedResults
      .filter(
         (result) =>
            moduleFilter === 'ALL' ||
            Number.isFinite(result.modules?.[moduleFilter])
      )
      .sort((first, second) =>
         compareResultsByClassAndMerit(first, second, moduleFilter)
      );
   const normalizedStudentSearch = studentSearch.trim().toLocaleLowerCase('fr');
   const displayedResults = rankedResults.filter((result) =>
      `${result.student?.matricule || ''} ${result.student?.firstName || ''} ${result.student?.lastName || ''}`
         .toLocaleLowerCase('fr')
         .includes(normalizedStudentSearch)
   );
   const modulePrintRows =
      moduleFilter === 'ALL'
         ? []
         : displayedResults.flatMap((result) =>
              result.subjects.map((subject) => ({
                 result,
                 subject,
                 evaluation: subject.evaluations?.find(
                    (item) => item.period === moduleFilter
                 ),
              }))
           );
   const ranksByEnrollment = new Map();
   const classRanks = new Map();
   rankedResults.forEach((result) => {
      const classId = result.class?._id || 'unknown';
      const rank = (classRanks.get(classId) || 0) + 1;
      classRanks.set(classId, rank);
      ranksByEnrollment.set(String(result.enrollment), rank);
   });

   const printResults = () => {
      const cleanup = () => document.body.classList.remove('print-bulletin');
      document.body.classList.add('print-bulletin');
      window.addEventListener('afterprint', cleanup, { once: true });
      window.print();
   };

   const finalizeSelectedResults = async () => {
      const scope = selectedClassId
         ? 'la classe sélectionnée'
         : 'toutes les classes de l’année sélectionnée';
      if (
         !window.confirm(
            `Valider et verrouiller définitivement toutes les notes soumises pour ${scope} ? Les notes manquantes, en brouillon ou en correction bloqueront l’opération.`
         )
      ) {
         return;
      }

      setError('');
      setNotice('');
      setIsFinalizing(true);
      try {
         const summary = await apiRequest('/results/finalize', {
            token,
            method: 'POST',
            body: {
               academicYearId: selectedYearId,
               ...(selectedClassId ? { classId: selectedClassId } : {}),
            },
         });
         setNotice(
            `${summary.updatedGrades} note(s) verrouillée(s) ; ${summary.finalResults} résultat(s) définitif(s).`
         );
         setRefreshKey((current) => current + 1);
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setIsFinalizing(false);
      }
   };

   const moduleOptions = [
      { value: 'ALL', label: 'Tous modules' },
      { value: 'MODULE_1', label: 'Module 1' },
      { value: 'MODULE_2', label: 'Module 2' },
   ];

   return (
      <section className="bulletin-workspace">
         <header className="bulletin-hero">
            <div>
               <p className="eyebrow">RÉSULTATS</p>
               <h2>Classements académiques</h2>
               <p>
                  {role === 'ENSEIGNANT'
                     ? 'Résultats des classes associées à vos notes saisies.'
                     : 'Les résultats provisoires évoluent avec les notes saisies et deviennent définitifs après validation complète.'}
               </p>
            </div>
            <span aria-hidden="true">▤</span>
         </header>
         {error && <p className="alert alert-error">{error}</p>}
         <section className="panel bulletin-finder">
            <div className="bulletin-finder-heading">
               <p className="eyebrow">FILTRES</p>
               <h3>Résultats à consulter</h3>
            </div>
            <div className="bulletin-select-grid">
               <label>
                  Année
                  <select
                     value={selectedYearId}
                     onChange={(event) => {
                        setSelectedYearId(event.target.value);
                        setSelectedClassId('');
                     }}>
                     <option value="">Toutes les années</option>
                     {years.map((year) => (
                        <option key={year._id} value={year._id}>
                           {year.label}
                        </option>
                     ))}
                  </select>
               </label>
               <label>
                  Classe
                  <select
                     value={selectedClassId}
                     onChange={(event) =>
                        setSelectedClassId(event.target.value)
                     }>
                     <option value="">Toutes les classes</option>
                     {availableClasses.map((schoolClass) => (
                        <option key={schoolClass._id} value={schoolClass._id}>
                           {schoolClass.name} · {schoolClass.level}
                        </option>
                     ))}
                  </select>
               </label>
               <label>
                  Module
                  <select
                     value={moduleFilter}
                     onChange={(event) => setModuleFilter(event.target.value)}>
                     {moduleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                           {option.label}
                        </option>
                     ))}
                  </select>
               </label>
            </div>
         </section>
         {notice && (
            <p className="form-note" role="status">
               {notice}
            </p>
         )}
         <section className="panel bulletin-roster-panel">
            <div className="panel-heading bulletin-roster-heading">
               <div>
                  <p className="eyebrow">CLASSEMENT</p>
                  <h3>
                     {displayedResults.length} résultat
                     {displayedResults.length === 1 ? '' : 's'}
                  </h3>
                  <p>
                     {role === 'ENSEIGNANT'
                        ? 'Ordre de mérite calculé séparément pour chaque classe.'
                        : 'Ordre de mérite établi sur la moyenne générale finale, par classe.'}
                  </p>
               </div>
               <div className="table-actions">
                  {role === 'DIRECTEUR_ETUDES' && (
                     <button
                        className="button button-primary"
                        onClick={finalizeSelectedResults}
                        disabled={
                           !selectedYearId ||
                           loading ||
                           isFinalizing ||
                           !scopedResults.some(
                              (result) => result.status !== 'FINAL'
                           )
                        }>
                        {isFinalizing ? 'Finalisation…' : 'Rendre définitifs'}
                     </button>
                  )}
                  <button
                     className="button button-primary"
                     onClick={printResults}
                     disabled={!displayedResults.length}>
                     {moduleFilter === 'ALL'
                        ? 'Imprimer le classement'
                        : 'Imprimer le détail du module'}
                  </button>
               </div>
            </div>
            <div className="results-search-row">
               <label htmlFor="results-student-search">
                  Rechercher un élève
                  <input
                     id="results-student-search"
                     type="search"
                     value={studentSearch}
                     onChange={(event) => setStudentSearch(event.target.value)}
                     placeholder="Nom, prénom ou matricule"
                  />
               </label>
               <span className="muted" aria-live="polite">
                  {displayedResults.length} sur {rankedResults.length} élèves
               </span>
            </div>
            {loading ? (
               <p className="bulletin-loading">Chargement des résultats…</p>
            ) : !displayedResults.length ? (
               <p className="muted">
                  {role === 'ENSEIGNANT'
                     ? 'Aucun résultat accessible pour cette sélection. Une classe apparaît ici dès qu’une note y a été saisie.'
                     : 'Aucun résultat disponible pour cette sélection. Vérifiez l’année, la classe ou la saisie des notes.'}
               </p>
            ) : (
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Rang</th>
                           <th>Matricule</th>
                           <th>Élève</th>
                           <th>Classe</th>
                           <th>Moyenne</th>
                           {moduleFilter === 'ALL' && (
                              <>
                                 <th>Module 1</th>
                                 <th>Module 2</th>
                              </>
                           )}{' '}
                           {moduleFilter !== 'ALL' && (
                              <th>Module sélectionné</th>
                           )}
                           <th>Décision</th>
                           <th>Statut</th>
                           <th>Détail</th>
                        </tr>
                     </thead>
                     <tbody>
                        {displayedResults.map((result) => (
                           <tr key={result.enrollment}>
                              <td>
                                 {ranksByEnrollment.get(
                                    String(result.enrollment)
                                 )}
                              </td>
                              <td>{result.student?.matricule || '—'}</td>
                              <td>
                                 {result.student?.firstName}{' '}
                                 {result.student?.lastName}
                              </td>
                              <td>
                                 {result.class?.name || '—'} ·{' '}
                                 {result.class?.level || '—'}
                              </td>
                              <td>
                                 {formatScaledResult(
                                    result.average,
                                    result.scale
                                 )}
                              </td>
                              {moduleFilter === 'ALL' ? (
                                 <>
                                    <td>
                                       {result.modules?.MODULE_1 == null
                                          ? '—'
                                          : result.modules.MODULE_1.toFixed(2)}
                                    </td>
                                    <td>
                                       {result.modules?.MODULE_2 == null
                                          ? '—'
                                          : result.modules.MODULE_2.toFixed(2)}
                                    </td>
                                 </>
                              ) : (
                                 <td>
                                    {formatScaledResult(
                                       result.modules?.[moduleFilter],
                                       result.scale
                                    )}
                                 </td>
                              )}
                              <td>{result.decision || '—'}</td>
                              <td>
                                 <span
                                    className={`status-pill ${result.status === 'FINAL' ? 'status-active' : 'status-pending'}`}>
                                    {result.status === 'FINAL'
                                       ? 'Définitif'
                                       : 'Provisoire'}
                                 </span>
                              </td>
                              <td>
                                 <button
                                    type="button"
                                    className="text-button result-detail-trigger"
                                    onClick={() => setSelectedResult(result)}
                                    aria-label={`Voir le détail de ${result.student?.firstName || ''} ${result.student?.lastName || ''}`}>
                                    Détail
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </section>
         {selectedResult && (
            <ModalDialog
               eyebrow="DOSSIER DE RÉSULTATS"
               title={
                  `${selectedResult.student?.firstName || ''} ${selectedResult.student?.lastName || ''}`.trim() ||
                  'Résultat élève'
               }
               onClose={() => setSelectedResult(null)}>
               <div className="result-detail-summary">
                  <div>
                     <span>CLASSE</span>
                     <strong>
                        {selectedResult.class?.name || '—'}
                        {selectedResult.class?.level
                           ? ` · ${selectedResult.class.level}`
                           : ''}
                     </strong>
                  </div>
                  <div>
                     <span>MATRICULE</span>
                     <strong>{selectedResult.student?.matricule || '—'}</strong>
                  </div>
                  <div>
                     <span>MOYENNE GÉNÉRALE</span>
                     <strong>
                        {formatScaledResult(
                           selectedResult.average,
                           selectedResult.scale
                        )}
                     </strong>
                  </div>
                  <div>
                     <span>DÉCISION</span>
                     <strong>{selectedResult.decision || 'En attente'}</strong>
                  </div>
               </div>
               <div className="table-wrap result-detail-table">
                  <table>
                     <thead>
                        <tr>
                           <th>Matière</th>
                           <th>Module</th>
                           <th>Oral</th>
                           <th>Écrit</th>
                           <th>Composition</th>
                           <th>Moyenne</th>
                           <th>État</th>
                        </tr>
                     </thead>
                     <tbody>
                        {selectedResult.subjects?.flatMap((subject) => {
                           const evaluations = subject.evaluations?.length
                              ? subject.evaluations
                              : [null];
                           return evaluations.map((evaluation, index) => (
                              <tr
                                 key={`${subject.subject?._id || subject.subject}-${evaluation?.evaluation || index}`}>
                                 <td>{subject.subject?.name || '—'}</td>
                                 <td>
                                    {evaluation
                                       ? formatEvaluationPeriod(
                                            evaluation.period
                                         )
                                       : 'Aucune évaluation'}
                                 </td>
                                 <td>{evaluation?.components?.oral ?? '—'}</td>
                                 <td>
                                    {evaluation?.components?.written ?? '—'}
                                 </td>
                                 <td>
                                    {evaluation?.components?.composition ?? '—'}
                                 </td>
                                 <td>
                                    {formatScaledResult(
                                       evaluation?.score,
                                       subject.scale
                                    )}
                                 </td>
                                 <td>
                                    {evaluation
                                       ? formatGradeStatus(evaluation.status)
                                       : 'Non saisie'}
                                 </td>
                              </tr>
                           ));
                        })}
                     </tbody>
                  </table>
               </div>
            </ModalDialog>
         )}
         <section className="print-document results-print-document">
            <p className="print-institution">IPROFIC Nelson Mandela</p>
            <p className="eyebrow">
               {years.find((year) => year._id === selectedYearId)?.label ||
                  'ANNÉE SCOLAIRE'}
               {' · '}
               {availableClasses.find(
                  (schoolClass) => schoolClass._id === selectedClassId
               )?.name || 'Toutes les classes'}
            </p>
            <h2>
               {moduleFilter === 'ALL'
                  ? 'Classement général'
                  : `Résultats détaillés · ${moduleFilter === 'MODULE_1' ? 'Module 1' : 'Module 2'}`}
            </h2>
            {moduleFilter === 'ALL' ? (
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Rang</th>
                           <th>Matricule</th>
                           <th>Élève</th>
                           <th>Classe</th>
                           <th>Moyenne générale</th>
                           <th>Module 1</th>
                           <th>Module 2</th>
                           <th>Statut</th>
                        </tr>
                     </thead>
                     <tbody>
                        {displayedResults.map((result) => (
                           <tr key={result.enrollment}>
                              <td>
                                 {ranksByEnrollment.get(
                                    String(result.enrollment)
                                 )}
                              </td>
                              <td>{result.student?.matricule || '—'}</td>
                              <td>
                                 {result.student?.firstName}{' '}
                                 {result.student?.lastName}
                              </td>
                              <td>{result.class?.name || '—'}</td>
                              <td>
                                 {formatScaledResult(
                                    result.average,
                                    result.scale
                                 )}
                              </td>
                              <td>
                                 {formatScaledResult(
                                    result.modules?.MODULE_1,
                                    result.scale
                                 )}
                              </td>
                              <td>
                                 {formatScaledResult(
                                    result.modules?.MODULE_2,
                                    result.scale
                                 )}
                              </td>
                              <td>
                                 {result.status === 'FINAL'
                                    ? 'Définitif'
                                    : 'Provisoire'}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <>
                  <p>
                     Les moyennes du module sont affichées sur le barème global
                     propre à chaque inscription.
                  </p>
                  <div className="table-wrap">
                     <table>
                        <thead>
                           <tr>
                              <th>Rang</th>
                              <th>Matricule</th>
                              <th>Élève</th>
                              <th>Matière</th>
                              <th>Coef.</th>
                              <th>Oral</th>
                              <th>Écrit</th>
                              <th>Composition</th>
                              <th>Moyenne matière / barème général</th>
                              <th>Moyenne module / barème global</th>
                              <th>État</th>
                           </tr>
                        </thead>
                        <tbody>
                           {modulePrintRows.map(
                              ({ result, subject, evaluation }) => (
                                 <tr
                                    key={`${result.enrollment}-${subject.subject?._id || subject.subject}`}>
                                    <td>
                                       {ranksByEnrollment.get(
                                          String(result.enrollment)
                                       )}
                                    </td>
                                    <td>{result.student?.matricule || '—'}</td>
                                    <td>
                                       {result.student?.firstName}{' '}
                                       {result.student?.lastName}
                                    </td>
                                    <td>{subject.subject?.name || '—'}</td>
                                    <td>{subject.coefficient}</td>
                                    <td>
                                       {evaluation?.components?.oral ?? '—'} /{' '}
                                       {subject.scale}
                                    </td>
                                    <td>
                                       {evaluation?.components?.written ?? '—'}{' '}
                                       / {subject.scale}
                                    </td>
                                    <td>
                                       {evaluation?.components?.composition ??
                                          '—'}{' '}
                                       / {subject.scale}
                                    </td>
                                    <td>
                                       {evaluation?.score == null
                                          ? '—'
                                          : `${evaluation.score.toFixed(2)} / ${subject.scale}`}
                                    </td>
                                    <td>
                                       {formatScaledResult(
                                          result.modules?.[moduleFilter],
                                          result.scale
                                       )}
                                    </td>
                                    <td>
                                       {evaluation
                                          ? gradeStatusLabels[
                                               evaluation.status
                                            ] || evaluation.status
                                          : 'Évaluation absente'}
                                    </td>
                                 </tr>
                              )
                           )}
                        </tbody>
                     </table>
                  </div>
               </>
            )}
         </section>
      </section>
   );
}

function BulletinPanel({ token }) {
   const [enrollments, setEnrollments] = useState([]);
   const [selectedYearId, setSelectedYearId] = useState('');
   const [selectedClassId, setSelectedClassId] = useState('');
   const [selectedId, setSelectedId] = useState('');
   const [matriculeSearch, setMatriculeSearch] = useState('');
   const [result, setResult] = useState(null);
   const [error, setError] = useState('');
   const [busy, setBusy] = useState(false);

   useEffect(() => {
      let active = true;
      apiRequest('/enrollments?status=APPROVED', { token })
         .then((data) => {
            if (active) setEnrollments(data);
         })
         .catch((requestError) => {
            if (active) setError(requestError.message);
         });
      return () => {
         active = false;
      };
   }, [token]);

   const academicYears = [
      ...new Map(
         enrollments
            .filter((enrollment) => enrollment.academicYear?._id)
            .map((enrollment) => [
               enrollment.academicYear._id,
               enrollment.academicYear,
            ])
      ).values(),
   ].sort((first, second) =>
      second.label.localeCompare(first.label, 'fr', { numeric: true })
   );
   const availableClasses = [
      ...new Map(
         enrollments
            .filter(
               (enrollment) =>
                  (!selectedYearId ||
                     enrollment.academicYear?._id === selectedYearId) &&
                  enrollment.class?._id
            )
            .map((enrollment) => [enrollment.class._id, enrollment.class])
      ).values(),
   ].sort((first, second) =>
      first.name.localeCompare(second.name, 'fr', { numeric: true })
   );
   const classEnrollments = enrollments
      .filter(
         (enrollment) =>
            (!selectedYearId ||
               enrollment.academicYear?._id === selectedYearId) &&
            (!selectedClassId || enrollment.class?._id === selectedClassId)
      )
      .filter(
         (enrollment) =>
            !matriculeSearch.trim() ||
            enrollment.student?.matricule
               ?.toLocaleUpperCase('fr')
               .includes(matriculeSearch.trim().toLocaleUpperCase('fr'))
      )
      .sort((first, second) =>
         `${first.student?.lastName || ''} ${first.student?.firstName || ''}`.localeCompare(
            `${second.student?.lastName || ''} ${second.student?.firstName || ''}`,
            'fr',
            { sensitivity: 'base' }
         )
      );
   const showStudentList = Boolean(
      matriculeSearch.trim() || selectedYearId || selectedClassId
   );

   const loadResult = async (enrollmentId) => {
      setSelectedId(enrollmentId);
      setResult(null);
      setError('');
      if (!enrollmentId) return;
      setBusy(true);
      try {
         setResult(
            await apiRequest(`/results/enrollments/${enrollmentId}`, { token })
         );
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setBusy(false);
      }
   };

   const chooseYear = (yearId) => {
      setSelectedYearId(yearId);
      setSelectedClassId('');
      setSelectedId('');
      setResult(null);
   };

   const chooseClass = (classId) => {
      setSelectedClassId(classId);
      setSelectedId('');
      setResult(null);
   };

   const print = () => {
      const cleanup = () => document.body.classList.remove('print-bulletin');
      document.body.classList.add('print-bulletin');
      window.addEventListener('afterprint', cleanup, { once: true });
      window.print();
   };

   return (
      <section className="bulletin-workspace">
         <header className="bulletin-hero">
            <div>
               <p className="eyebrow">DOCUMENTS SCOLAIRES</p>
               <h2>Rechercher un bulletin</h2>
               <p>
                  Entrez le matricule de l’élève. Vous pouvez préciser l’année
                  et la classe s’il possède plusieurs inscriptions.
               </p>
            </div>
            <span aria-hidden="true">▤</span>
         </header>
         {error && <p className="alert alert-error">{error}</p>}
         <section className="panel bulletin-finder">
            <div className="bulletin-finder-heading">
               <p className="eyebrow">RECHERCHE DIRECTE</p>
               <h3>Identifier l’élève</h3>
            </div>
            <div className="bulletin-select-grid">
               <label className="bulletin-matricule-search">
                  Matricule de l’élève
                  <input
                     type="search"
                     value={matriculeSearch}
                     onChange={(event) => {
                        setMatriculeSearch(event.target.value);
                        setSelectedId('');
                        setResult(null);
                     }}
                     placeholder="Saisir tout ou partie du matricule"
                     autoComplete="off"
                  />
               </label>
               <label>
                  Année scolaire
                  <select
                     value={selectedYearId}
                     onChange={(event) => chooseYear(event.target.value)}>
                     <option value="">Toutes les années</option>
                     {academicYears.map((year) => (
                        <option key={year._id} value={year._id}>
                           {year.label}
                        </option>
                     ))}
                  </select>
               </label>
               <label>
                  Classe
                  <select
                     value={selectedClassId}
                     onChange={(event) => chooseClass(event.target.value)}>
                     <option value="">Toutes les classes</option>
                     {availableClasses.map((schoolClass) => (
                        <option key={schoolClass._id} value={schoolClass._id}>
                           {schoolClass.name} · {schoolClass.level}
                        </option>
                     ))}
                  </select>
               </label>
            </div>
         </section>
         {showStudentList ? (
            <section className="panel bulletin-roster-panel">
               <div className="panel-heading bulletin-roster-heading">
                  <div>
                     <p className="eyebrow">INSCRIPTIONS APPROUVÉES</p>
                     <h3>
                        {classEnrollments.length} résultat
                        {classEnrollments.length === 1 ? '' : 's'}
                     </h3>
                     <p>
                        Choisissez l’inscription correspondante pour afficher le
                        bulletin individuel.
                     </p>
                  </div>
               </div>
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Matricule</th>
                           <th>Élève</th>
                           <th>Année scolaire</th>
                           <th>Classe</th>
                           <th>Programme</th>
                           <th>Bulletin</th>
                        </tr>
                     </thead>
                     <tbody>
                        {classEnrollments.map((enrollment) => (
                           <tr key={enrollment._id}>
                              <td>{enrollment.student?.matricule || '—'}</td>
                              <td>
                                 {enrollment.student?.firstName}{' '}
                                 {enrollment.student?.lastName}
                              </td>
                              <td>{enrollment.academicYear?.label || '—'}</td>
                              <td>
                                 {enrollment.class?.name || '—'}
                                 {enrollment.class?.level
                                    ? ` · ${enrollment.class.level}`
                                    : ''}
                              </td>
                              <td>{enrollment.program?.name || '—'}</td>
                              <td>
                                 <button
                                    className={
                                       selectedId === enrollment._id
                                          ? 'button button-primary bulletin-view-button'
                                          : 'button button-secondary bulletin-view-button'
                                    }
                                    disabled={busy}
                                    onClick={() => loadResult(enrollment._id)}>
                                    {busy && selectedId === enrollment._id
                                       ? 'Calcul…'
                                       : selectedId === enrollment._id
                                         ? 'Bulletin ouvert'
                                         : 'Voir le bulletin'}
                                 </button>
                              </td>
                           </tr>
                        ))}
                        {!classEnrollments.length && (
                           <tr>
                              <td colSpan="6" className="empty-cell">
                                 Aucun élève ne correspond à cette recherche.
                                 Vérifiez le matricule ou élargissez les
                                 filtres.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </section>
         ) : (
            <div className="bulletin-search-hint">
               <span aria-hidden="true">⌕</span>
               <strong>Commencez par saisir un matricule</strong>
               <p>
                  Vous verrez les inscriptions approuvées de l’élève, année et
                  classe comprises.
               </p>
            </div>
         )}
         {busy && (
            <p className="bulletin-loading">Calcul du bulletin individuel…</p>
         )}
         {result && (
            <div className="panel result-panel print-document bulletin-result">
               <p className="print-institution">IPROFIC Nelson Mandela</p>
               <div className="panel-heading">
                  <div>
                     <p className="eyebrow">
                        {result.academicYear?.label} · {result.program?.name}
                     </p>
                     <h3>Bulletin individuel</h3>
                     <p>
                        {result.student?.firstName} {result.student?.lastName} ·{' '}
                        {result.student?.matricule} · {result.class?.name}
                     </p>
                  </div>
                  <div className="result-actions">
                     <span
                        className={`status-pill ${result.status === 'FINAL' ? 'status-active' : 'status-pending'}`}>
                        {result.status === 'FINAL' ? 'Définitif' : 'Provisoire'}
                     </span>
                     <button
                        className="button button-primary print-button"
                        onClick={print}>
                        Imprimer au format A4
                     </button>
                  </div>
               </div>
               {result.status === 'PROVISIONAL' && (
                  <p className="form-note">
                     Document provisoire : des notes sont manquantes ou en
                     attente de validation.
                  </p>
               )}
               <div className="table-wrap">
                  <table>
                     <thead>
                        <tr>
                           <th>Matière</th>
                           <th>Coef. matière</th>
                           <th>Moyenne matière / barème global</th>
                           <th>Module</th>
                           <th>Coef. évaluation</th>
                           <th>Oral / barème général</th>
                           <th>Écrit / barème général</th>
                           <th>Composition / barème général</th>
                           <th>Moyenne évaluation</th>
                           <th>Statut de la note</th>
                        </tr>
                     </thead>
                     <tbody>
                        {result.subjects?.flatMap((subject) => {
                           const evaluations = subject.evaluations?.length
                              ? subject.evaluations
                              : [null];
                           return evaluations.map((item, index) => (
                              <tr
                                 key={`${subject.subject?._id || subject.subject}-${item?.evaluation || index}`}>
                                 <td>{subject.subject?.name || '—'}</td>
                                 <td>{subject.coefficient}</td>
                                 <td>
                                    {formatScaledResult(
                                       subject.normalizedAverage,
                                       result.scale
                                    )}
                                 </td>
                                 <td>
                                    {item
                                       ? formatEvaluationPeriod(item.period)
                                       : 'Aucune évaluation'}
                                 </td>
                                 <td>{item?.weight ?? '—'}</td>
                                 <td>
                                    {item?.components?.oral ?? '—'} /{' '}
                                    {subject.scale}
                                 </td>
                                 <td>
                                    {item?.components?.written ?? '—'} /{' '}
                                    {subject.scale}
                                 </td>
                                 <td>
                                    {item?.components?.composition ?? '—'} /{' '}
                                    {subject.scale}
                                 </td>
                                 <td>
                                    {formatScaledResult(
                                       item?.score,
                                       subject.scale
                                    )}
                                 </td>
                                 <td>
                                    {item
                                       ? gradeStatusLabels[item.status] ||
                                         item.status
                                       : 'Évaluation absente'}
                                 </td>
                              </tr>
                           ));
                        })}
                     </tbody>
                  </table>
               </div>
               <p className="result-average">
                  {result.average == null ? '—' : result.average.toFixed(2)}{' '}
                  <span>/ {result.scale || '—'}</span>
               </p>
               <p className="form-note">
                  Décision :{' '}
                  {result.decision || 'En attente de validation complète'}
               </p>
            </div>
         )}
      </section>
   );
}

function StudentResultCard({ result, index }) {
   const [activeModule, setActiveModule] = useState('MODULE_1');
   const printResult = (event) => {
      const card = event.currentTarget.closest('.student-result-card');
      const cleanup = () => {
         card.classList.remove('print-document');
         document.body.classList.remove('print-bulletin');
      };

      card.classList.add('print-document');
      document.body.classList.add('print-bulletin');
      window.addEventListener('afterprint', cleanup, { once: true });
      window.print();
   };
   const moduleSubjects = (result.subjects || []).flatMap((subject) => {
      const evaluations = (subject.evaluations || []).filter(
         (evaluation) => evaluation.period === activeModule
      );
      return evaluations.length
         ? evaluations.map((evaluation, evaluationIndex) => ({
              subject,
              evaluation,
              evaluationIndex,
           }))
         : [{ subject, evaluation: null, evaluationIndex: 0 }];
   });

   return (
      <section
         id={index === 0 ? 'student-results' : undefined}
         className="panel result-panel student-result-card"
         key={result.enrollment}>
         <p className="print-institution">IPROFIC Nelson Mandela</p>
         <div className="panel-heading">
            <div>
               <p className="eyebrow">
                  {result.academicYear?.label || 'ANNÉE SCOLAIRE'}
               </p>
               <h3>
                  {result.program?.name || 'Résultats académiques'} ·{' '}
                  {result.class?.name || ''}
               </h3>
            </div>
            <div className="result-actions">
               <span
                  className={`status-pill ${result.status === 'FINAL' ? 'status-active' : 'status-pending'}`}>
                  {result.status === 'FINAL' ? 'Définitif' : 'Provisoire'}
               </span>
               <button
                  className="button button-secondary print-button"
                  onClick={printResult}>
                  Imprimer le relevé
               </button>
            </div>
         </div>
         <div className="student-result-summary">
            <div>
               <span>Moyenne générale</span>
               <strong>
                  {formatScaledResult(result.average, result.scale)}
               </strong>
            </div>
            <div>
               <span>Module 1</span>
               <strong>
                  {formatScaledResult(result.modules?.MODULE_1, result.scale)}
               </strong>
            </div>
            <div>
               <span>Module 2</span>
               <strong>
                  {formatScaledResult(result.modules?.MODULE_2, result.scale)}
               </strong>
            </div>
         </div>
         {result.status === 'PROVISIONAL' && (
            <p className="form-note">
               Résultat provisoire.{' '}
               {result.reasons?.filter((reason) =>
                  reason.startsWith('GRADE_MISSING:')
               ).length || 0}{' '}
               note(s) non saisie(s). La moyenne provisoire tient compte
               uniquement des notes saisies.
            </p>
         )}
         <div
            className="student-module-switch"
            role="group"
            aria-label="Module à consulter">
            {[
               ['MODULE_1', 'Module 1'],
               ['MODULE_2', 'Module 2'],
            ].map(([module, label]) => (
               <button
                  type="button"
                  key={module}
                  aria-pressed={activeModule === module}
                  className={activeModule === module ? 'selected' : ''}
                  onClick={() => setActiveModule(module)}>
                  {label}
               </button>
            ))}
         </div>
         {moduleSubjects.length ? (
            <div className="table-wrap">
               <table>
                  <thead>
                     <tr>
                        <th>Matière</th>
                        <th>Oral</th>
                        <th>Écrit</th>
                        <th>Composition</th>
                        <th>Moyenne</th>
                        <th>État</th>
                     </tr>
                  </thead>
                  <tbody>
                     {moduleSubjects.map(
                        ({ subject, evaluation, evaluationIndex }) => (
                           <tr
                              key={`${subject.subject?._id || subject.subject}-${activeModule}-${evaluation?.evaluation || evaluationIndex}`}>
                              <td>
                                 {subject.subject?.name ||
                                    subject.subject?.code ||
                                    'Matière'}
                              </td>
                              <td>{evaluation?.components?.oral ?? '—'}</td>
                              <td>{evaluation?.components?.written ?? '—'}</td>
                              <td>
                                 {evaluation?.components?.composition ?? '—'}
                              </td>
                              <td>
                                 {formatScaledResult(
                                    evaluation?.score,
                                    subject.scale
                                 )}
                              </td>
                              <td>
                                 <span
                                    className={`status-pill ${gradeStatusClass(evaluation?.status)}`}>
                                    {formatGradeStatus(
                                       evaluation?.status || 'NOT_ENTERED'
                                    )}
                                 </span>
                              </td>
                           </tr>
                        )
                     )}
                  </tbody>
               </table>
            </div>
         ) : (
            <p className="muted">Aucune matière n’est disponible.</p>
         )}
      </section>
   );
}

function Dashboard({ user, dashboard, token, onLogout }) {
   const [activePanel, setActivePanel] = useState('overview');
   const [initialStudyView, setInitialStudyView] = useState('evaluations');
   const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
   const [navigationQuery, setNavigationQuery] = useState('');
   const [overviewData, setOverviewData] = useState(dashboard);
   const [selectedYearId, setSelectedYearId] = useState(
      dashboard.selectedAcademicYearId || ''
   );
   const [loadingYear, setLoadingYear] = useState(false);
   const [yearError, setYearError] = useState('');
   const roleLabel = ROLE_LABELS[user.role] || user.role;

   const navigateToPanel = (panel, studyView) => {
      if (panel === 'pedagogy') setInitialStudyView(studyView || 'evaluations');
      setActivePanel(panel);
   };

   const changeOverviewYear = async (academicYearId) => {
      if (!academicYearId || academicYearId === selectedYearId || loadingYear)
         return;
      const previousYearId = selectedYearId;
      setSelectedYearId(academicYearId);
      setLoadingYear(true);
      setYearError('');
      try {
         const data = await apiRequest(
            `/dashboard/me?academicYear=${encodeURIComponent(academicYearId)}`,
            { token }
         );
         setOverviewData(data);
         setSelectedYearId(data.selectedAcademicYearId || academicYearId);
      } catch (requestError) {
         setSelectedYearId(previousYearId);
         setYearError(requestError.message);
      } finally {
         setLoadingYear(false);
      }
   };

   const navigationGroups = [
      {
         label: 'Accueil',
         items: [
            {
               id: 'overview',
               label: 'Vue d’ensemble',
               icon: '◫',
               primary: true,
            },
            ...([
               'ADMIN',
               'DIRECTEUR_ETUDES',
               'DIRECTEUR_SCOLARITE',
               'ENSEIGNANT',
            ].includes(user.role)
               ? [
                    {
                       id: 'results',
                       label: 'Résultats',
                       icon: '▧',
                       primary: true,
                    },
                 ]
               : []),
            { id: 'guide', label: 'Guide d’utilisation', icon: '?' },
         ],
      },
      {
         label: 'Scolarité',
         items: [
            ...(['ADMIN', 'DIRECTEUR_ETUDES'].includes(user.role)
               ? [{ id: 'documents', label: 'Documents scolaires', icon: '▤' }]
               : []),
            ...(['ADMIN', 'DIRECTEUR_ETUDES', 'DIRECTEUR_SCOLARITE'].includes(
               user.role
            )
               ? [
                    { id: 'classes', label: 'Classes et élèves', icon: '▦' },
                    { id: 'headcount', label: 'Effectifs', icon: '▥' },
                 ]
               : []),
            ...(['ADMIN', 'DIRECTEUR_SCOLARITE'].includes(user.role)
               ? [{ id: 'enrollments', label: 'Inscriptions', icon: '▤' }]
               : []),
         ],
      },
      {
         label: 'Pédagogie et notes',
         items: [
            ...(user.role === 'DIRECTEUR_ETUDES'
               ? [{ id: 'pedagogy', label: 'Pédagogie', icon: '⌑' }]
               : []),
            ...(['ADMIN', 'DIRECTEUR_ETUDES'].includes(user.role)
               ? [{ id: 'setup', label: 'Paramétrage', icon: '⚙' }]
               : []),
            ...(user.role === 'ADMIN'
               ? [
                    {
                       id: 'exceptions',
                       label: 'Corrections de notes',
                       icon: '✎',
                    },
                 ]
               : []),
         ],
      },
      {
         label: 'Administration',
         items: [
            ...(user.role === 'ADMIN'
               ? [
                    { id: 'users', label: 'Utilisateurs', icon: '♙' },
                    { id: 'audit', label: 'Journal d’audit', icon: '◷' },
                 ]
               : []),
         ],
      },
   ].filter((group) => group.items.length);
   const activeNavigationItem = navigationGroups
      .flatMap((group) =>
         group.items.map((item) => ({ ...item, group: group.label }))
      )
      .find((item) => item.id === activePanel);
   const normalizedNavigationQuery = navigationQuery
      .trim()
      .toLocaleLowerCase('fr');
   const renderNavigationItem = (item) => (
      <button
         key={item.id}
         className={`nav-item ${item.primary ? 'nav-primary' : ''} ${activePanel === item.id ? 'nav-active' : ''}`}
         aria-current={activePanel === item.id ? 'page' : undefined}
         onClick={() => {
            setActivePanel(item.id);
            setMobileNavigationOpen(false);
            setNavigationQuery('');
         }}>
         <span aria-hidden="true">{item.icon}</span> {item.label}
      </button>
   );

   const refreshOverview = async () => {
      try {
         const data = await apiRequest(
            `/dashboard/me?academicYear=${encodeURIComponent(selectedYearId)}`,
            { token }
         );
         setOverviewData(data);
      } catch (requestError) {
         setYearError(requestError.message);
      }
   };

   return (
      <div className="app-shell">
         <aside className="sidebar">
            <div className="brand-lockup">
               <span className="brand-mark small-mark">IP</span>
               <span>
                  IPROFIC
                  <br />
                  Nelson Mandela
               </span>
            </div>
            <nav
               className="sidebar-navigation"
               aria-label="Navigation principale">
               {navigationGroups.map((group) => (
                  <section className="sidebar-nav-group" key={group.label}>
                     <p className="nav-caption">{group.label}</p>
                     {group.items.map(renderNavigationItem)}
                  </section>
               ))}
            </nav>
            <button
               type="button"
               className="nav-item mobile-nav-more"
               aria-expanded={mobileNavigationOpen}
               onClick={() => setMobileNavigationOpen((open) => !open)}>
               <span aria-hidden="true">☷</span> Plus
            </button>
            {mobileNavigationOpen && (
               <section
                  className="mobile-nav-panel"
                  aria-label="Toutes les rubriques">
                  <div className="mobile-nav-panel-heading">
                     <strong>Accéder à une rubrique</strong>
                     <button
                        type="button"
                        className="mobile-nav-close"
                        aria-label="Fermer le menu"
                        onClick={() => setMobileNavigationOpen(false)}>
                        ×
                     </button>
                  </div>
                  <input
                     type="search"
                     aria-label="Rechercher une rubrique"
                     placeholder="Rechercher une rubrique…"
                     value={navigationQuery}
                     onChange={(event) =>
                        setNavigationQuery(event.target.value)
                     }
                  />
                  {navigationGroups.map((group) => {
                     const matchingItems = group.items.filter(
                        (item) =>
                           !item.primary &&
                           `${item.label} ${group.label}`
                              .toLocaleLowerCase('fr')
                              .includes(normalizedNavigationQuery)
                     );
                     return matchingItems.length ? (
                        <div className="mobile-nav-group" key={group.label}>
                           <p className="nav-caption">{group.label}</p>
                           {matchingItems.map(renderNavigationItem)}
                        </div>
                     ) : null;
                  })}
                  {!navigationGroups.some((group) =>
                     group.items.some(
                        (item) =>
                           !item.primary &&
                           `${item.label} ${group.label}`
                              .toLocaleLowerCase('fr')
                              .includes(normalizedNavigationQuery)
                     )
                  ) && (
                     <p className="mobile-nav-empty">
                        Aucune rubrique trouvée.
                     </p>
                  )}
               </section>
            )}
            <div className="sidebar-bottom">
               <button className="nav-item logout-button" onClick={onLogout}>
                  <span>↪</span> Déconnexion
               </button>
            </div>
         </aside>

         <main className="main-area">
            <header
               className={
                  activePanel === 'overview'
                     ? 'topbar topbar-overview'
                     : 'topbar'
               }>
               <div>
                  <p className="eyebrow">
                     {activeNavigationItem?.group?.toLocaleUpperCase('fr') ||
                        'ESPACE DE TRAVAIL'}
                  </p>
                  <h1>
                     {activePanel === 'overview'
                        ? 'Tableau de bord'
                        : activePanel === 'results'
                          ? 'Résultats par classe'
                          : activeNavigationItem?.label || 'Espace de travail'}
                  </h1>
               </div>
               <div className="topbar-meta">
                  <div className="topbar-date">
                     {new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'long',
                     }).format(new Date())}
                  </div>
                  <div className="topbar-account">
                     <div className="topbar-account-avatar" aria-hidden="true">
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                     </div>
                     <div className="topbar-account-copy">
                        <strong>
                           {user.firstName} {user.lastName}
                        </strong>
                        <span>{roleLabel}</span>
                     </div>
                  </div>
               </div>
            </header>

            {activePanel === 'users' && user.role === 'ADMIN' ? (
               <UsersPanel token={token} currentUserId={user._id} />
            ) : activePanel === 'exceptions' && user.role === 'ADMIN' ? (
               <ExceptionalGradesPanel token={token} />
            ) : activePanel === 'audit' && user.role === 'ADMIN' ? (
               <AuditPanel token={token} />
            ) : activePanel === 'documents' &&
              ['ADMIN', 'DIRECTEUR_ETUDES'].includes(user.role) ? (
               <BulletinPanel token={token} />
            ) : activePanel === 'results' &&
              [
                 'ADMIN',
                 'DIRECTEUR_ETUDES',
                 'DIRECTEUR_SCOLARITE',
                 'ENSEIGNANT',
              ].includes(user.role) ? (
               <ResultsBoardPanel
                  token={token}
                  role={user.role}
                  assignments={overviewData.assignments || []}
                  academicYears={overviewData.academicYears || []}
               />
            ) : activePanel === 'headcount' &&
              ['ADMIN', 'DIRECTEUR_ETUDES', 'DIRECTEUR_SCOLARITE'].includes(
                 user.role
              ) ? (
               <EnrollmentHeadcountPanel token={token} />
            ) : activePanel === 'classes' &&
              ['ADMIN', 'DIRECTEUR_ETUDES', 'DIRECTEUR_SCOLARITE'].includes(
                 user.role
              ) ? (
               <ClassRosterPanel token={token} />
            ) : activePanel === 'guide' ? (
               <UserGuidePanel
                  role={user.role}
                  dashboard={overviewData}
                  onNavigate={navigateToPanel}
               />
            ) : activePanel === 'setup' &&
              ['ADMIN', 'DIRECTEUR_ETUDES'].includes(user.role) ? (
               <AdminSetupPanel token={token} role={user.role} />
            ) : activePanel === 'enrollments' &&
              ['ADMIN', 'DIRECTEUR_SCOLARITE'].includes(user.role) ? (
               <SchoolingPanel token={token} role={user.role} />
            ) : activePanel === 'pedagogy' &&
              user.role === 'DIRECTEUR_ETUDES' ? (
               <StudiesPanel token={token} initialDataView={initialStudyView} />
            ) : (
               <>
                  {yearError && (
                     <p className="alert alert-error">{yearError}</p>
                  )}
                  {user.role === 'ENSEIGNANT' ? (
                     <TeacherOverview
                        user={user}
                        dashboard={overviewData}
                        token={token}
                        selectedYearId={selectedYearId}
                        loadingYear={loadingYear}
                        onYearChange={changeOverviewYear}
                        onRefresh={refreshOverview}
                     />
                  ) : (
                     <OverviewHero
                        user={user}
                        dashboard={overviewData}
                        roleLabel={roleLabel}
                        selectedYearId={selectedYearId}
                        loadingYear={loadingYear}
                        onYearChange={changeOverviewYear}
                        onNavigate={navigateToPanel}
                     />
                  )}
                  {user.role !== 'ENSEIGNANT' && (
                     <div
                        className={
                           loadingYear
                              ? 'overview-year-data overview-year-data-loading'
                              : 'overview-year-data'
                        }
                        aria-busy={loadingYear}>
                        <DashboardMetrics
                           dashboard={overviewData}
                           onNavigate={navigateToPanel}
                        />
                        <OverviewShortcuts
                           role={user.role}
                           onNavigate={navigateToPanel}
                        />
                        {user.role === 'ELEVE' && overviewData.student && (
                           <section className="panel student-profile">
                              <div className="panel-heading">
                                 <div>
                                    <p className="eyebrow">MON DOSSIER</p>
                                    <h3>
                                       {overviewData.student.firstName}{' '}
                                       {overviewData.student.lastName}
                                    </h3>
                                 </div>
                                 <span className="role-badge">
                                    Matricule {overviewData.student.matricule}
                                 </span>
                              </div>
                              <div className="student-enrollments">
                                 {overviewData.results?.map((result) => (
                                    <p key={result.enrollment}>
                                       <strong>
                                          {result.academicYear?.label}
                                       </strong>
                                       <span>
                                          {result.program?.name} ·{' '}
                                          {result.class?.name} (
                                          {result.class?.level})
                                       </span>
                                    </p>
                                 ))}
                              </div>
                           </section>
                        )}
                        {user.role === 'ELEVE' &&
                           overviewData.results?.map((result, index) => (
                              <StudentResultCard
                                 key={result.enrollment}
                                 result={result}
                                 index={index}
                              />
                           ))}
                     </div>
                  )}
               </>
            )}
         </main>
      </div>
   );
}

function App() {
   const [session, setSession] = useState(null);
   const [dashboard, setDashboard] = useState(null);
   const [loading, setLoading] = useState(true);
   const [loadError, setLoadError] = useState('');
   const resetToken = new URLSearchParams(window.location.search).get(
      'resetToken'
   );

   const clearSession = useCallback(() => {
      localStorage.removeItem('gestion-notes-token');
      localStorage.removeItem('gestion-notes-user');
      sessionStorage.removeItem('gestion-notes-token');
      sessionStorage.removeItem('gestion-notes-user');
      setSession(null);
      setDashboard(null);
   }, []);

   const loadDashboard = useCallback(async (token, user) => {
      const data = await apiRequest('/dashboard/me', { token });
      setSession({ token, user });
      setDashboard(data);
      setLoadError('');
      localStorage.setItem('gestion-notes-token', token);
      localStorage.setItem('gestion-notes-user', JSON.stringify(user));
      sessionStorage.removeItem('gestion-notes-token');
      sessionStorage.removeItem('gestion-notes-user');
   }, []);

   useEffect(() => {
      const token =
         localStorage.getItem('gestion-notes-token') ||
         sessionStorage.getItem('gestion-notes-token');
      const user =
         localStorage.getItem('gestion-notes-user') ||
         sessionStorage.getItem('gestion-notes-user');
      if (!token || !user) {
         setLoading(false);
         return;
      }
      localStorage.setItem('gestion-notes-token', token);
      localStorage.setItem('gestion-notes-user', user);
      sessionStorage.removeItem('gestion-notes-token');
      sessionStorage.removeItem('gestion-notes-user');

      let parsedUser;
      try {
         parsedUser = JSON.parse(user);
      } catch {
         clearSession();
         setLoading(false);
         return;
      }

      if (parsedUser.mustChangePassword) {
         setSession({ token, user: parsedUser });
         setLoading(false);
         return;
      }

      loadDashboard(token, parsedUser)
         .catch((error) => {
            setLoadError(error.message);
            clearSession();
         })
         .finally(() => setLoading(false));
   }, [clearSession, loadDashboard]);

   const handleLogin = async ({ token, user }) => {
      localStorage.setItem('gestion-notes-token', token);
      localStorage.setItem('gestion-notes-user', JSON.stringify(user));
      sessionStorage.removeItem('gestion-notes-token');
      sessionStorage.removeItem('gestion-notes-user');
      if (user.mustChangePassword) {
         setSession({ token, user });
         return;
      }
      await loadDashboard(token, user);
   };

   const handlePasswordChange = async ({ token, user }) => {
      await loadDashboard(token, user);
   };

   if (loading)
      return <div className="loading-screen">Chargement de votre espace…</div>;
   if (resetToken) return <ResetPasswordForm token={resetToken} />;
   if (!session)
      return (
         <>
            <LoginForm onLogin={handleLogin} />
            {loadError && <div className="toast-error">{loadError}</div>}
         </>
      );
   if (session.user.mustChangePassword) {
      return (
         <ChangePasswordForm
            token={session.token}
            onComplete={handlePasswordChange}
            onLogout={clearSession}
         />
      );
   }
   if (!dashboard)
      return (
         <div className="loading-screen">Chargement du tableau de bord…</div>
      );

   return (
      <Dashboard
         user={session.user}
         dashboard={dashboard}
         token={session.token}
         onLogout={clearSession}
      />
   );
}

export default App;
