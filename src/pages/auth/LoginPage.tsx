import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FiArrowRight, FiCheck, FiLock, FiMail, FiShield, FiUser } from 'react-icons/fi';
import Brand from '../../components/Brand';
import ThemeToggle from '../../components/ThemeToggle';
import { loginUser, requestPinReset } from '../../services/auth.service';
import type { User } from '../../types/app';

export function LoginPage({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [rollNumber, setRollNumber] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [email, setEmail] = useState('');

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await loginUser(rollNumber.trim(), pin);
      onLogin(data.token, data.user);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to connect to the server.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await requestPinReset(rollNumber.trim(), email.trim());
      toast.success(data.message || 'If your details match, a new PIN will be emailed.');
      setShowReset(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to connect to the server.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <ThemeToggle className="login-theme-toggle" />
      <section className="login-left">
        <div className="login-brand-wrap"><Brand /></div>
        <div className="login-content">
          <div className="login-eyebrow"><span /> COLLABORATIVE NOTES SHARING</div>
          <h1>Make room<br />for <span>brighter</span><br />thinking.</h1>
          <p className="login-intro">Your notes, tasks, and study community — all organized around the way you learn.</p>
          <div className="login-benefits">
            <div><span><FiCheck /></span> Keep every class in sync</div>
            <div><span><FiCheck /></span> Pick up right where you left off</div>
          </div>
        </div>
        <div className="login-footer">Noteus · Collaborative Notes Sharing <span>Made for curious minds</span></div>
      </section>
      <section className="login-right">
        <div className="login-card">
          <div className="login-mobile-brand"><Brand /></div>
          <div className="login-icon"><FiLock /></div>
          <p className="login-welcome">WELCOME BACK</p>
          <h2>{showReset ? 'Reset your PIN' : 'Sign in to your space'}</h2>
          <p className="login-subtitle">{showReset ? 'We’ll email you a new PIN if your details match.' : 'Use your campus roll number and PIN to continue.'}</p>

          {!showReset ? (
            <form className="login-form" onSubmit={submitLogin}>
              <label htmlFor="roll-number">Roll number</label>
              <div className="input-wrap"><FiUser /><input id="roll-number" value={rollNumber} onChange={(event) => setRollNumber(event.target.value)} placeholder="e.g. 20260042" required autoComplete="username" /></div>
              <div className="label-row"><label htmlFor="pin">6-digit PIN</label><button type="button" className="text-link" onClick={() => { setShowReset(true); setError(''); }}>Forgot PIN?</button></div>
              <div className="input-wrap"><FiLock /><input id="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} placeholder="Enter your PIN" required autoComplete="current-password" /></div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <FiArrowRight /></button>
            </form>
          ) : (
            <form className="login-form" onSubmit={submitReset}>
              <label htmlFor="reset-roll">Roll number</label>
              <div className="input-wrap"><FiUser /><input id="reset-roll" value={rollNumber} onChange={(event) => setRollNumber(event.target.value)} placeholder="Your campus roll number" required /></div>
              <label htmlFor="email">Campus email</label>
              <div className="input-wrap"><FiMail /><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" required /></div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button w-full" disabled={busy}>{busy ? 'Sending…' : 'Send a new PIN'} <FiArrowRight /></button>
              <button type="button" className="back-link" onClick={() => { setShowReset(false); setError(''); }}>Back to sign in</button>
            </form>
          )}
          <div className="secure-note"><FiShield /> Your account is private and secure</div>
          <Link className="admin-entry-link" to="/admin">Admin panel</Link>
        </div>
      </section>
    </div>
  );
}
