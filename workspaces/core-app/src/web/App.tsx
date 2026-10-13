import { useEffect, useState } from "react";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { OperatorDashboardPage } from "./pages/OperatorDashboardPage";
import { ResidentWorksPage } from "./pages/ResidentWorksPage";
import { ReceiptPage } from "./pages/ReceiptPage";
import { StudioPage } from "./pages/StudioPage";
import { IntakePage } from "./pages/IntakePage";

function getProjectId(): string | null {
  const match = window.location.pathname.match(/^\/projects\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isOperatorPath(): boolean {
  return window.location.pathname === "/operator";
}

function isStudioPath(): boolean { return window.location.pathname === "/operator/studio"; }
function isIntakePath(): boolean { return window.location.pathname === "/operator/intake"; }
function studioFocusId(): string | null { return new URLSearchParams(window.location.search).get("focus"); }

function isReceiptPath(): boolean {
  return window.location.pathname === "/receipt";
}

export function App() {
  const [projectId, setProjectId] = useState<string | null>(() => getProjectId());
  const [operatorPath, setOperatorPath] = useState(() => isOperatorPath());
  const [receiptPath, setReceiptPath] = useState(() => isReceiptPath());
  const [studioPath, setStudioPath] = useState(() => isStudioPath());
  const [intakePath, setIntakePath] = useState(() => isIntakePath());
  const [studioFocus, setStudioFocus] = useState<string | null>(() => studioFocusId());
  const [receiptToken, setReceiptToken] = useState<string | undefined>();

  useEffect(() => {
    const onPopState = () => { setProjectId(getProjectId()); setOperatorPath(isOperatorPath()); setReceiptPath(isReceiptPath()); setStudioPath(isStudioPath()); setIntakePath(isIntakePath()); setStudioFocus(studioFocusId()); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function openProject(id: string) {
    window.history.pushState({}, "", `/projects/${encodeURIComponent(id)}`);
    setProjectId(id);
    setOperatorPath(false);
    setReceiptPath(false);
    setStudioPath(false);
    setIntakePath(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToWorks() {
    window.history.pushState({}, "", "/");
    setProjectId(null);
    setOperatorPath(false);
    setReceiptPath(false);
    setStudioPath(false);
    setIntakePath(false);
  }

  function goToOperator() {
    window.history.pushState({}, "", "/operator");
    setProjectId(null);
    setOperatorPath(true);
    setReceiptPath(false);
    setStudioPath(false);
    setIntakePath(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToReceipt(token: string) {
    window.history.pushState({}, "", "/receipt");
    setReceiptToken(token);
    setReceiptPath(true);
    setProjectId(null);
    setOperatorPath(false);
    setStudioPath(false);
    setIntakePath(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStudio(focusId?: string) {
    const suffix = focusId ? `?focus=${encodeURIComponent(focusId)}` : "";
    window.history.pushState({}, "", `/operator/studio${suffix}`);
    setProjectId(null); setReceiptPath(false); setOperatorPath(false); setIntakePath(false); setStudioPath(true); setStudioFocus(focusId ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToIntake() {
    window.history.pushState({}, "", "/operator/intake");
    setProjectId(null); setReceiptPath(false); setOperatorPath(false); setStudioPath(false); setIntakePath(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); goToWorks(); }}>
          <span className="brand-mark" aria-hidden="true">O</span>
          <span>onedig<span className="brand-period">.</span><small>PUBLIC WORKS, CONNECTED</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a className={`nav-link ${!operatorPath && !studioPath && !intakePath && !receiptPath && !projectId ? "active" : ""}`} href="/" onClick={(event) => { event.preventDefault(); goToWorks(); }}>Public works</a>
          <a className={`nav-link ${operatorPath || studioPath || intakePath ? "active" : ""}`} href="/operator" onClick={(event) => { event.preventDefault(); goToOperator(); }}>Operator</a>
          <span className="nav-note">Illustrative demo</span>
        </nav>
      </header>
      <main id="main-content">
        {projectId ? <ProjectDetailPage id={projectId} onBack={goToWorks} onReceipt={goToReceipt} /> : receiptPath ? <ReceiptPage initialToken={receiptToken} onBack={goToWorks} /> : studioPath ? <StudioPage initialProjectId={studioFocus} onBack={goToOperator} onOpenProject={openProject} /> : intakePath ? <IntakePage onBack={goToOperator} onOpenStudio={goToStudio} /> : operatorPath ? <OperatorDashboardPage onOpenProject={openProject} onOpenStudio={goToStudio} onOpenIntake={goToIntake} /> : <ResidentWorksPage onOpenProject={openProject} />}
      </main>
      <footer className="site-footer"><span>OneDig</span><span>Project records shown here are illustrative unless otherwise stated.</span></footer>
    </div>
  );
}
