import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db, getCurrentUser } from './firebase';
import { Project, Step, CreateProjectInput, UpdateStepInput } from '../types';

const PROJECTS_COLLECTION = 'projects';
const STEPS_SUBCOLLECTION = 'steps';

// Projects
export const createProject = async (input: CreateProjectInput): Promise<string> => {
  const user = getCurrentUser();
  if (!user) throw new Error('User must be authenticated');

  const projectData = {
    userId: user.uid,
    title: input.title,
    description: input.description,
    status: 'active',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    currentStepIndex: 0,
    totalSteps: input.steps.length
  };

  const projectRef = await addDoc(collection(db, PROJECTS_COLLECTION), projectData);

  // Create steps as subcollection
  const stepsPromises = input.steps.map((step, index) => {
    const stepData = {
      projectId: projectRef.id,
      title: step.title,
      description: step.description,
      status: index === 0 ? 'pending' : 'pending',
      order: index,
      automatable: step.automatable,
      automationAttempted: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    return addDoc(collection(db, PROJECTS_COLLECTION, projectRef.id, STEPS_SUBCOLLECTION), stepData);
  });

  await Promise.all(stepsPromises);
  return projectRef.id;
};

export const getProjects = async (): Promise<Project[]> => {
  const q = query(collection(db, PROJECTS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Project;
  }
  return null;
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await deleteDoc(docRef);
};

// Steps
export const getSteps = async (projectId: string): Promise<Step[]> => {
  const q = query(
    collection(db, PROJECTS_COLLECTION, projectId, STEPS_SUBCOLLECTION),
    orderBy('order', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Step));
};

export const getStep = async (projectId: string, stepId: string): Promise<Step | null> => {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId, STEPS_SUBCOLLECTION, stepId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Step;
  }
  return null;
};

export const updateStep = async (
  projectId: string,
  stepId: string,
  updates: UpdateStepInput
): Promise<void> => {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId, STEPS_SUBCOLLECTION, stepId);
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now()
  };

  if (updates.status === 'completed') {
    updateData.completedAt = Timestamp.now();
  }

  await updateDoc(docRef, updateData);
};

// Real-time listeners
export const subscribeToProjects = (callback: (projects: Project[]) => void) => {
  const user = getCurrentUser();
  if (!user) {
    console.error('User must be authenticated to subscribe to projects');
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('userId', '==', user.uid),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      callback(projects);
    },
    (error) => {
      console.error('Error subscribing to projects:', error);
      callback([]);
    }
  );
};

export const subscribeToSteps = (projectId: string, callback: (steps: Step[]) => void) => {
  const q = query(
    collection(db, PROJECTS_COLLECTION, projectId, STEPS_SUBCOLLECTION),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const steps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Step));
    callback(steps);
  });
};
