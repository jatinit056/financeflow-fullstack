import { CircleAlert } from 'lucide-react';
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

const DEMO_ENABLED = import.meta.env.VITE_DEMO_ENABLED !== 'false';
// GitHub Pages build: the API runs inside the browser (see src/demo/demoBackend.js).
const STATIC_DEMO = import.meta.env.MODE === 'pages';

export default function LoginPage() {
  useDocumentTitle('Log in');
  const { login, startDemo } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(null); // 'login' | 'demo' | null
  const slow = useDelayedFlag(pending !== null, 5000);

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!values.email.trim()) nextErrors.email = 'Enter your email';
    if (!values.password) nextErrors.password = 'Enter your password';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setPending('login');
    setFormError('');
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
    } catch (error) {
      setErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error));
      setPending(null);
    }
  }

  async function handleDemo() {
    setPending('demo');
    setFormError('');
    try {
      await startDemo();
      toast.success('Your demo account is ready. Explore freely.');
    } catch (error) {
      setFormError(getErrorMessage(error));
      setPending(null);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Log in</h1>
      <p className="mt-2 text-ink-2">Welcome back. Pick up where you left off.</p>

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

        <Field label="Email" error={errors.email}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              invalid={Boolean(errors.email)}
              type="email"
              autoComplete="email"
              autoFocus
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
              autoComplete="current-password"
              value={values.password}
              onChange={update('password')}
            />
          )}
        </Field>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={pending === 'login'}
          disabled={pending !== null}
        >
          Log in
        </Button>
      </form>

      {DEMO_ENABLED && (
        <div className="mt-6 rounded-xl border border-rule bg-surface p-4">
          <p className="text-sm font-medium text-ink">Just looking around?</p>
          <p className="mt-0.5 text-sm text-ink-2">
            Open a demo account filled with six months of sample data. No sign-up, and it's deleted
            after 24 hours.
          </p>
          <Button
            variant="secondary"
            className="mt-3 w-full"
            onClick={handleDemo}
            loading={pending === 'demo'}
            disabled={pending !== null}
          >
            Explore the demo
          </Button>
        </div>
      )}

      {STATIC_DEMO && (
        <p className="mt-4 text-sm text-ink-2">
          This live demo runs entirely in your browser, so anything you add stays on this device.
          You can also log in as <span className="font-medium text-ink">demo@financeflow.app</span>{' '}
          / <span className="font-medium text-ink">Demo@12345</span>.
        </p>
      )}

      {slow && !STATIC_DEMO && (
        <p role="status" className="mt-4 text-sm text-ink-2">
          Waking up the server. On free hosting the first request can take up to a minute.
        </p>
      )}

      <p className="mt-8 text-sm text-ink-2">
        New to FinanceFlow?{' '}
        <Link
          to="/register"
          className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-700"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
