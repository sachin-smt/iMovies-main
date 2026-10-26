
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import { HERO_SCREEN_IMAGES } from "./heroScreenImages";

const API_URL = "http://localhost:5000";
const GOOGLE_CLIENT_ID = "344115065043-b05suij00jf6qlj1qnas0m3jt3u0b3et.apps.googleusercontent.com";

function Auth({ mode, onLogin }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);
  const [previousPosterIndex, setPreviousPosterIndex] = useState(0);
  const [posterTransitioning, setPosterTransitioning] = useState(false);
  const [failedPosterIndexes, setFailedPosterIndexes] = useState(() => new Set());

  useEffect(() => {
    const preloadedImages = HERO_SCREEN_IMAGES.map((source, index) => {
      const image = new Image();
      image.src = source;
      image.onerror = () => {
        setFailedPosterIndexes((current) => {
          if (current.has(index)) return current;
          const next = new Set(current);
          next.add(index);
          return next;
        });
      };
      return image;
    });

    return () => {
      preloadedImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return undefined;

    const timer = window.setInterval(() => {
      setPosterIndex((current) => {
        for (let offset = 1; offset <= HERO_SCREEN_IMAGES.length; offset += 1) {
          const nextIndex = (current + offset) % HERO_SCREEN_IMAGES.length;
          if (!failedPosterIndexes.has(nextIndex)) {
            setPreviousPosterIndex(current);
            setPosterTransitioning(true);
            window.setTimeout(() => {
              setPreviousPosterIndex(nextIndex);
              setPosterTransitioning(false);
            }, 1200);
            return nextIndex;
          }
        }
        return current;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [failedPosterIndexes]);

  function handlePosterError(index) {
    setFailedPosterIndexes((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }

  useEffect(() => {
    if (isRegister) return;

    let cancelled = false;

    function initializeGoogle() {
      if (
        cancelled ||
        !googleButtonRef.current ||
        !window.google?.accounts?.id
      ) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) {
            setError("Google sign-in did not return a credential.");
            return;
          }

          setError("");
          setLoading(true);

          try {
            const result = await fetch(`${API_URL}/api/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                credential: response.credential,
              }),
            });

            const data = await result.json();

            if (!result.ok) {
              throw new Error(data.message || "Google login failed");
            }

            onLogin(data);
            navigate("/");
          } catch (err) {
            setError(err.message || "Unable to connect to the server");
          } finally {
            setLoading(false);
          }
        },
      });

      googleButtonRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 320,
      });
    }

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      let script = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );

      if (!script) {
        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      script.addEventListener("load", initializeGoogle);

      return () => {
        cancelled = true;
        script.removeEventListener("load", initializeGoogle);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [isRegister, navigate, onLogin]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
     setError("Passwords do not match.");
      return;
     }

      setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/${isRegister ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isRegister ? { name, email, password } : { email, password }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      if (isRegister) {
        setError("Registration successful! You can now log in.");
        setPassword("");
        setConfirmPassword("");
      } else {
        onLogin(data);
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-poster-background" aria-hidden="true">
        <img
          className={`auth-poster-layer ${posterTransitioning ? "is-visible" : ""}`}
          src={HERO_SCREEN_IMAGES[previousPosterIndex]}
          alt=""
          onError={() => handlePosterError(previousPosterIndex)}
        />
        <img
          className={`auth-poster-layer ${posterTransitioning ? "" : "is-visible"}`}
          src={HERO_SCREEN_IMAGES[posterIndex]}
          alt=""
          onError={() => handlePosterError(posterIndex)}
        />
        <div className="auth-poster-overlay" />
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="auth-logo" to="/">
          i<span>MOVIES</span>
        </Link>

        <p className="auth-eyebrow">
          {isRegister ? "JOIN THE EXPERIENCE" : "WELCOME BACK"}
        </p>

        <h1>{isRegister ? "Create account" : "Sign in"}</h1>

        <p className="auth-subtitle">
          {isRegister
            ? "Create your account to book your next movie."
            : "Sign in to continue your movie experience."}
        </p>

        {isRegister && (
          <label className="floating-field">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder=" "
            />
            <span>Full name</span>
          </label>
        )}

        <label className="floating-field">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder=" "
          />
          <span>Email address</span>
        </label>

        <label className="floating-field">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder=" "
          />
          <span>Password</span>
        </label>

        {isRegister && (
        <label className="floating-field">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder=" "
          />
          <span>Confirm Password</span>
        </label>
        )}

        {error && (
          <p className="auth-message" role="status">
            {error}
          </p>
        )}

        <button className="auth-submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : isRegister
              ? "Create account"
              : "Sign in"}
        </button>

        {!isRegister && (
          <>
            <div className="auth-divider">
              <span>OR CONTINUE WITH</span>
            </div>
            <div className="google-button-wrap" ref={googleButtonRef} />
          </>
        )}

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to IMovies?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create account"}
          </Link>
        </p>

        <Link className="auth-home" to="/">
          ← Back to movies
        </Link>
      </form>
    </main>
  );
}

export default Auth;
