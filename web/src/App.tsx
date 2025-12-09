import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import ProjectList from './components/ProjectList';
import ProjectForm from './components/ProjectForm';
import ProjectDetail from './components/ProjectDetail';
import { Project } from './types';
import { signIn, signOut, onAuthChange } from './services/firebase';

type View = 'list' | 'form' | 'detail';

function App() {
  const [view, setView] = useState<View>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('test1@example.com');
  const [password, setPassword] = useState('test123');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await signIn(email, password);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setView('list');
    setSelectedProject(null);
  };

  const handleCreateClick = () => {
    setView('form');
  };

  const handleFormSuccess = () => {
    setView('list');
  };

  const handleFormCancel = () => {
    setView('list');
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedProject(null);
    setView('list');
  };

  if (authLoading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={styles.app}>
        <div style={styles.authContainer}>
          <h1 style={styles.authTitle}>Project Manager</h1>
          <form onSubmit={handleSignIn} style={styles.authForm}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={styles.input}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={styles.input}
            />
            {authError && <p style={styles.error}>{authError}</p>}
            <button type="submit" style={styles.authButton}>Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Project Manager</h1>
        <div style={styles.headerRight}>
          <span style={styles.userEmail}>{user.email}</span>
          {view === 'list' && (
            <button onClick={handleCreateClick} style={styles.createButton}>
              + New Project
            </button>
          )}
          <button onClick={handleSignOut} style={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {view === 'list' && <ProjectList onSelectProject={handleSelectProject} />}
        {view === 'form' && (
          <ProjectForm onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
        )}
        {view === 'detail' && selectedProject && (
          <ProjectDetail project={selectedProject} onBack={handleBack} />
        )}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#666'
  },
  authContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px'
  },
  authTitle: {
    marginBottom: '32px',
    fontSize: '28px',
    fontWeight: 600,
    color: '#333'
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '320px'
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    outline: 'none'
  },
  authButton: {
    padding: '12px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  error: {
    color: '#d32f2f',
    fontSize: '14px',
    margin: 0
  },
  header: {
    backgroundColor: 'white',
    padding: '16px 24px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userEmail: {
    fontSize: '14px',
    color: '#666'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: '#333'
  },
  createButton: {
    padding: '10px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  signOutButton: {
    padding: '10px 20px',
    backgroundColor: '#757575',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px'
  }
};

export default App;
