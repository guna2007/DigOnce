import { useEffect, useState } from "react";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { OperatorDashboardPage } from "./pages/OperatorDashboardPage";
import { ResidentWorksPage } from "./pages/ResidentWorksPage";
import { ReceiptPage } from "./pages/ReceiptPage";

function getProjectId(): string | null {
  const match = window.location.pathname.match(/^\/projects\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isOperatorPath(): boolean {
  return window.location.pathname === "/operator";
}

function isReceiptPath(): boolean {
  return window.location.pathname === "/receipt";
}

export function App() {
  const [projectId, setProjectId] = useState<string | null>(() => getProjectId());
  const [operatorPath, setOperatorPath] = useState(() => isOperatorPath());
  const [receiptPath, setReceiptPath] = useState(() => isReceiptPath());
  const [receiptToken, setReceiptToken] = useState<string | undefined>();

  useEffect(() => {
    const onPopState = () => { setProjectId(getProjectId()); setOperatorPath(isOperatorPath()); setReceiptPath(isReceiptPath()); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function openProject(id: string) {
    window.history.pushState({}, "", `/projects/${encodeURIComponent(id)}`);
    setProjectId(id);
    setOperatorPath(false);
    setReceiptPath(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToWorks() {
    window.history.pushState({}, "", "/");
    setProjectId(null);
    setOperatorPath(false);
    setReceiptPath(false);
  }

  function goToOperator() {
    window.history.pushState({}, "", "/operator");
    setProjectId(null);
    setOperatorPath(true);
    setReceiptPath(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToReceipt(token: string) {
    window.history.pushState({}, "", "/receipt");
    setReceiptToken(token);
    setReceiptPath(true);
    setProjectId(null);
    setOperatorPath(false);
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
          <a className={`nav-link ${!operatorPath && !receiptPath && !projectId ? "active" : ""}`} href="/" onClick={(event) => { event.preventDefault(); goToWorks(); }}>Public works</a>
          <a className={`nav-link ${operatorPath ? "active" : ""}`} href="/operator" onClick={(event) => { event.preventDefault(); goToOperator(); }}>Operator</a>
          <span className="nav-note">Illustrative demo</span>
        </nav>
      </header>
      <main id="main-content">
        {projectId ? <ProjectDetailPage id={projectId} onBack={goToWorks} onReceipt={goToReceipt} /> : receiptPath ? <ReceiptPage initialToken={receiptToken} onBack={goToWorks} /> : operatorPath ? <OperatorDashboardPage onOpenProject={openProject} /> : <ResidentWorksPage onOpenProject={openProject} />}
      </main>
      <footer className="site-footer"><span>OneDig</span><span>Project records shown here are illustrative unless otherwise stated.</span></footer>
    </div>
  );
}
