import { Check, CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/useAuth.js';
import { Button } from '../components/ui/Button.jsx';
import { Field, Input } from '../components/ui/Field.jsx';
import { PasswordInput } from '../components/ui/PasswordInput.jsx';
import { useDelayedFlag } from '../hooks/useDelayedFlag.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { getErrorMessage, getFieldErrors } from '../lib/errors.js';
import { useToast } from '../toast/useToast.js';
import { AuthLayout } from './auth/AuthLayout.jsx';

const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'letter', label: 'A letter', test: (value) => /[A-Za-z]/.test(value) },
  { id: 'number', label: 'A number', test: (value) => /\d/.test(value) },
];

function validate({ name, email, password }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Enter your name (at least 2 characters)';
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!PASSWORD_RULES.every((rule) => rule.test(password))) {
    errors.password = 'Choose a password that meets all three rules';
  }
  return errors;
}

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slow = useDelayedFlag(submitting, 5000);

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const user = await register(values);
      toast.success(`Welcome to FinanceFlow, ${user.name.split(' ')[0]}.`);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length || error.response?.status === 409) {
        setFormError(getErrorMessage(error));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-ink-2">It takes less than a minute.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-critical/10 px-3 py-2.5 text-sm text-negative"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {formError}
          </p>
        )}

        <Field label="Name" error={errors.name}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              invalid={Boolean(errors.name)}
              autoComplete="name"
              autoFocus
              value={values.name}
              onChange={update('name')}
            />
          )}
        </Field>

        <Field label="Email" error={errors.email}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              invalid={Boolean(errors.email)}
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={update('email')}
            />
          )}
        </Field>

        <Field label="Password" error={errors.password}>
          {(fieldProps) => (
            <PasswordInput
              {...fieldProps}
              invalid={Boolean(errors.password)}
              autoComplete="new-password"
              value={values.password}
              onChange={update('password')}
            />
          )}
        </Field>

        <ul className="-mt-2 grid gap-1.5 text-sm sm:grid-cols-3" aria-label="Password rules">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(values.password);
            return (
              <li
                key={rule.id}
                className={`flex items-center gap-1.5 ${met ? 'text-positive' : 'text-ink-3'}`}
              >
                <Check
                  aria-hidden="true"
                  className={`size-4 ${met ? '' : 'opacity-40'}`}
                  strokeWidth={2.5}
                />
                {rule.label}
                <span className="sr-only">{met ? '(done)' : '(not yet)'}</span>
              </li>
            );
          })}
        </ul>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>

      {slow && (
        <p role="status" className="mt-4 text-sm text-ink-2">
          Waking up the server. On free hosting the first request can take up to a minute.
        </p>
      )}

      <p className="mt-8 text-sm text-ink-2">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-700"
        >
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
