import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();

// Use the named 'default' database (not the '(default)' database)
export const db = getFirestore(admin.app(), "default");
