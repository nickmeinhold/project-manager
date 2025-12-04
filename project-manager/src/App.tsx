import React, { useState } from 'react';
import ProjectList from './components/ProjectList';
import ProjectForm from './components/ProjectForm';
import ProjectDetail from './components/ProjectDetail';
import { Project } from './types';

type View = 'list' | 'form' | 'detail';

function App() {
  const [view, setView] = useState<View>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Project Manager</h1>
        {view === 'list' && (
          <button onClick={handleCreateClick} style={styles.createButton}>
            + New Project
          </button>
        )}
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
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px'
  }
};

export default App;
