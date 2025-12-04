import React, { useEffect, useState } from 'react';
import { Project, Step } from '../types';
import { subscribeToSteps, updateStep } from '../services/projectService';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onBack }) => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStepId, setUpdatingStepId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSteps(project.id, (updatedSteps) => {
      setSteps(updatedSteps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [project.id]);

  const handleStatusChange = async (stepId: string, newStatus: Step['status']) => {
    setUpdatingStepId(stepId);
    try {
      await updateStep(project.id, stepId, { status: newStatus });
    } catch (error) {
      console.error('Error updating step:', error);
    } finally {
      setUpdatingStepId(null);
    }
  };

  const getStepStatusColor = (status: Step['status']) => {
    switch (status) {
      case 'pending':
        return '#757575';
      case 'in_progress':
        return '#FF9800';
      case 'completed':
        return '#4CAF50';
      case 'failed':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading steps...</div>;
  }

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backButton}>
        ← Back to Projects
      </button>

      <div style={styles.header}>
        <h1 style={styles.projectTitle}>{project.title}</h1>
        <span style={styles.projectStatus}>{project.status}</span>
      </div>

      <p style={styles.projectDescription}>{project.description}</p>

      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${(project.currentStepIndex / project.totalSteps) * 100}%`
          }}
        />
      </div>

      <p style={styles.progressText}>
        {project.currentStepIndex} of {project.totalSteps} steps completed
      </p>

      <div style={styles.stepsContainer}>
        <h2 style={styles.stepsTitle}>Steps</h2>

        {steps.map((step, index) => (
          <div key={step.id} style={styles.stepCard}>
            <div style={styles.stepHeader}>
              <div style={styles.stepTitleRow}>
                <span style={styles.stepNumber}>Step {index + 1}</span>
                <h3 style={styles.stepTitle}>{step.title}</h3>
              </div>
              <div
                style={{
                  ...styles.stepStatusBadge,
                  backgroundColor: getStepStatusColor(step.status)
                }}
              >
                {step.status.replace('_', ' ')}
              </div>
            </div>

            <p style={styles.stepDescription}>{step.description}</p>

            <div style={styles.stepMeta}>
              <span style={styles.automatable}>
                {step.automatable ? '🤖 Automatable' : '👤 Manual'}
              </span>
              {step.automationAttempted && (
                <span style={styles.automationStatus}>
                  Automation attempted
                </span>
              )}
            </div>

            {step.automationResult && (
              <div style={styles.automationResult}>
                <strong>Result:</strong> {step.automationResult}
              </div>
            )}

            <div style={styles.stepActions}>
              {step.status === 'pending' && (
                <button
                  onClick={() => handleStatusChange(step.id, 'in_progress')}
                  style={styles.actionButton}
                  disabled={updatingStepId === step.id}
                >
                  Start
                </button>
              )}

              {step.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => handleStatusChange(step.id, 'completed')}
                    style={{ ...styles.actionButton, ...styles.successButton }}
                    disabled={updatingStepId === step.id}
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={() => handleStatusChange(step.id, 'failed')}
                    style={{ ...styles.actionButton, ...styles.failButton }}
                    disabled={updatingStepId === step.id}
                  >
                    Mark Failed
                  </button>
                </>
              )}

              {step.status === 'failed' && (
                <button
                  onClick={() => handleStatusChange(step.id, 'in_progress')}
                  style={styles.actionButton}
                  disabled={updatingStepId === step.id}
                >
                  Retry
                </button>
              )}

              {step.status === 'completed' && step.completedAt && (
                <span style={styles.completedTime}>
                  Completed {step.completedAt.toDate().toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#f5f5f5',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  projectTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 600,
    color: '#333'
  },
  projectStatus: {
    padding: '6px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: 500,
    textTransform: 'capitalize'
  },
  projectDescription: {
    color: '#666',
    fontSize: '16px',
    marginBottom: '24px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '32px'
  },
  stepsContainer: {
    marginTop: '24px'
  },
  stepsTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#333'
  },
  stepCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px'
  },
  stepHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  stepTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  stepNumber: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#999',
    textTransform: 'uppercase'
  },
  stepTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333'
  },
  stepStatusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    color: 'white',
    textTransform: 'capitalize'
  },
  stepDescription: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '16px'
  },
  stepMeta: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    fontSize: '13px'
  },
  automatable: {
    color: '#666',
    fontWeight: 500
  },
  automationStatus: {
    color: '#2196F3',
    fontWeight: 500
  },
  automationResult: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '13px',
    marginBottom: '16px',
    color: '#666'
  },
  stepActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  successButton: {
    backgroundColor: '#4CAF50'
  },
  failButton: {
    backgroundColor: '#f44336'
  },
  completedTime: {
    fontSize: '13px',
    color: '#999'
  }
};

export default ProjectDetail;
