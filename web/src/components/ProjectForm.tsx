import React, { useState } from 'react';
import { CreateProjectInput, CreateStepInput } from '../types';
import { createProject } from '../services/projectService';

interface ProjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<CreateStepInput[]>([
    { title: '', description: '', automatable: false }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addStep = () => {
    setSteps([...steps, { title: '', description: '', automatable: false }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, field: keyof CreateStepInput, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    if (steps.some(s => !s.title.trim())) {
      setError('All steps must have a title');
      return;
    }

    setLoading(true);

    try {
      const input: CreateProjectInput = {
        title: title.trim(),
        description: description.trim(),
        steps: steps.map(s => ({
          title: s.title.trim(),
          description: s.description.trim(),
          automatable: s.automatable
        }))
      };

      await createProject(input);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Create New Project</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              placeholder="Enter project title"
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...styles.input, ...styles.textarea }}
              placeholder="Enter project description"
              disabled={loading}
            />
          </div>

          <div style={styles.stepsSection}>
            <div style={styles.stepsSectionHeader}>
              <label style={styles.label}>Steps</label>
              <button
                type="button"
                onClick={addStep}
                style={styles.addStepButton}
                disabled={loading}
              >
                + Add Step
              </button>
            </div>

            {steps.map((step, index) => (
              <div key={index} style={styles.stepCard}>
                <div style={styles.stepHeader}>
                  <span style={styles.stepNumber}>Step {index + 1}</span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      style={styles.removeButton}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                  style={styles.input}
                  placeholder="Step title"
                  disabled={loading}
                />

                <textarea
                  value={step.description}
                  onChange={(e) => updateStep(index, 'description', e.target.value)}
                  style={{ ...styles.input, ...styles.textarea }}
                  placeholder="Step description"
                  disabled={loading}
                />

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={step.automatable}
                    onChange={(e) => updateStep(index, 'automatable', e.target.checked)}
                    disabled={loading}
                  />
                  <span>Can be automated by AI</span>
                </label>
              </div>
            ))}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              style={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  title: {
    margin: '0 0 24px 0',
    fontSize: '24px',
    fontWeight: 600,
    color: '#333'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical'
  },
  stepsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  stepsSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  addStepButton: {
    padding: '6px 12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  stepCard: {
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  stepHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stepNumber: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#666'
  },
  removeButton: {
    padding: '4px 8px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#666',
    cursor: 'pointer'
  },
  error: {
    padding: '12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    fontSize: '14px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  }
};

export default ProjectForm;
