import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import { subscribeToProjects } from '../services/projectService';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToProjects((updatedProjects) => {
      setProjects(updatedProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'paused':
        return '#FF9800';
      default:
        return '#757575';
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading projects...</div>;
  }

  if (projects.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No projects yet. Create your first project!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {projects.map((project) => (
        <div
          key={project.id}
          style={{
            ...styles.projectCard,
            boxShadow: hoveredId === project.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
          }}
          onMouseEnter={() => setHoveredId(project.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => onSelectProject(project)}
        >
          <div style={styles.projectHeader}>
            <h3 style={styles.projectTitle}>{project.title}</h3>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: getStatusColor(project.status)
              }}
            >
              {project.status}
            </span>
          </div>
          <p style={styles.projectDescription}>{project.description}</p>
          <div style={styles.projectFooter}>
            <span style={styles.stepProgress}>
              Step {project.currentStepIndex + 1} of {project.totalSteps}
            </span>
            <span style={styles.date}>
              {project.updatedAt.toDate().toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  projectCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s'
  },
  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  projectTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    color: 'white',
    textTransform: 'capitalize'
  },
  projectDescription: {
    margin: '8px 0',
    color: '#666',
    fontSize: '14px'
  },
  projectFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f0f0f0'
  },
  stepProgress: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#2196F3'
  },
  date: {
    fontSize: '12px',
    color: '#999'
  }
};

export default ProjectList;
