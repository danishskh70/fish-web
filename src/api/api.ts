// Screens import ONLY from this file. It picks the live FastAPI backend, or the in-browser demo.
//   live (default):  npm run dev            → backend via the Vite proxy (/api → http://localhost:8000)
//   demo (no server): VITE_USE_STUB=1 npm run dev
import * as stub from "./stubApi";
import * as live from "./liveApi";

export const MODE: "live" | "demo" = import.meta.env.VITE_USE_STUB === "1" ? "demo" : "live";
const m: typeof stub = MODE === "demo" ? stub : live;

export const isAuthed = m.isAuthed;
export const login = m.login;
export const logout = m.logout;
export const pingBackend = m.pingBackend;
export const getProfile = m.getProfile;
export const updateProfile = m.updateProfile;
export const patchPreferences = m.patchPreferences;
export const setRates = m.setRates;
export const resetDemoData = m.resetDemoData;
export const listFish = m.listFish;
export const setFishActive = m.setFishActive;
export const setFishPhoto = m.setFishPhoto;
export const listSuppliers = m.listSuppliers;
export const listTrips = m.listTrips;
export const getActiveTripId = m.getActiveTripId;
export const getTrip = m.getTrip;
export const createTrip = m.createTrip;
export const closeTrip = m.closeTrip;
export const getTripCustomer = m.getTripCustomer;
export const recordHandover = m.recordHandover;
export const recordPayment = m.recordPayment;
export const voidPayment = m.voidPayment;
export const getReceipt = m.getReceipt;
export const listCustomers = m.listCustomers;
export const addCustomer = m.addCustomer;
export const getCustomer = m.getCustomer;
export const getOutstanding = m.getOutstanding;
export const getLowStock = m.getLowStock;
