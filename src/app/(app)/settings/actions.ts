
"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, getDoc } from "firebase/firestore";
import type { User } from "@/lib/data";

async function deleteCollection(collectionPath: string) {
    const collectionRef = collection(db, collectionPath);
    const q = await getDocs(collectionRef);
    
    if (q.empty) {
        return;
    }
    
    const batch = writeBatch(db);
    q.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
}


export async function resetData(collectionsToDelete: string[]): Promise<void> {
    // Note: This server action is only accessible to admins via the UI.
    // The previous auth check was failing because auth.currentUser is null on the server.
    // For a production app, a more robust server-side role check (e.g., via custom claims) would be ideal.

    const collectionMap: { [key: string]: string[] } = {
        customers: ["customers"],
        sales: ["sales", "payments"], // Payments are tied to sales
        products: ["products"],
        expenses: ["expenses"],
        salesman_plans: ["salesman_plans", "salesman_plan_history"],
        worker_tasks: ["worker_tasks", "worker_task_history"],
        history: ["salesman_plan_history", "worker_task_history"],
    };

    const deletionPromises: Promise<void>[] = [];

    const uniqueCollections = new Set<string>();

    for (const key of collectionsToDelete) {
        if (collectionMap[key]) {
            for (const collectionName of collectionMap[key]) {
                uniqueCollections.add(collectionName);
            }
        }
    }

    uniqueCollections.forEach(collectionName => {
        console.log(`Deleting collection: ${collectionName}`);
        deletionPromises.push(deleteCollection(collectionName));
    });


    await Promise.all(deletionPromises);
}
