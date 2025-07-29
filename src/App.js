import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, setDoc, Timestamp, query, limit, where, enableIndexedDbPersistence } from 'firebase/firestore';
import { PlusCircle, Trash2, Edit, Save, XCircle, Download, LogIn, LogOut, BarChart2, CheckCircle } from 'lucide-react';
import Calendar from 'react-calendar';
import './styles/Calendar.css';
import './styles/Watermark.css';

const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(err => console.error("Error enabling Firestore persistence:", err));
const auth = getAuth(app);
const appId = process.env.REACT_APP_APP_ID || 'default-app-id';

const playerList = ["Ale Perrone", "Alexis", "Ariel", "Bruno", "Condor", "Coreano", "Daniel", "Diego Balazo", "Elvis", "Ezequiel", "Facundo", "Federico", "Fito", "Franco", "Gaby Mecanico", "German", "Guillermo", "Hector Musico", "Hugo", "Ivan", "Javier", "Joni", "Julian Olivieri", "Julian Rugna", "Lautaro", "Leandro", "Lucy", "Luigi", "Luis", "Marcelo", "Marcelo Zurdo", "Mariano", "Mario Arriola", "Martin", "Matias", "Maxi", "Mono", "Nacho", "Nico Ciudad", "Raul", "Roberto", "Rodrigo", "Ruben", "Sergio", "Sosa", "Tano", "Tito", "Vasco", "Zurdo Diaz", "Zurdo Ruben"].sort();
const welcomePlayerList = ["Bruno", "Ezequiel", "Ruben"].sort();
const playerPins = { "Bruno": "1234", "Ruben": "5678", "Ezequiel": "3456" };
const isPredefinedPlayer = playerName => playerName && playerList.includes(playerName);

const CopyrightFooter = () => (
 <footer className="mt-6 text-center text-gray-300 text-sm">
 © 2025 Bruno Canedo. Prohibida la reproducción o uso de la app sin permiso.
 </footer>
);

class ErrorBoundary extends React.Component {
 state = { hasError: false, error: null };

 static getDerivedStateFromError(error) {
 return { hasError: true, error };
 }

 render() {
 if (this.state.hasError) {
 return (
 <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4">
 <strong className="font-bold">Error:</strong>
 <span className="block sm:inline"> Ocurrió un error al renderizar la página. Por favor, recarga la página o contacta al administrador.</span>
 <p className="text-sm mt-2">Detalles: {this.state.error?.message}</p>
 </div>
 );
 }
 return this.props.children;
 }
}

function App() {
 const [matches, setMatches] = useState([]);
 const [deletedMatches, setDeletedMatches] = useState([]);
 const [fetchedDailySummaries, setFetchedDailySummaries] = useState({});
 const [newMatch, setNewMatch] = useState({
 team1Player1: { value: '', type: 'dropdown' },
 team1Player2: { value: '', type: 'dropdown' },
 team2Player1: { value: '', type: 'dropdown' },
 team2Player2: { value: '', type: 'dropdown' },
 scoreTeam1: '',
 scoreTeam2: '',
 comment: '',
 date: new Date().toISOString().split('T')[0],
 });
 const [userId, setUserId] = useState(null);
 const [loading, setLoading] = useState(true);
 const [editingMatchId, setEditingMatchId] = useState(null);
 const [editedMatch, setEditedMatch] = useState(null);
 const [showConfirmModal, setShowConfirmModal] = useState(false);
 const [matchToDelete, setMatchToDelete] = useState(null);
 const [errorMessage, setErrorMessage] = useState('');
 const [selectedDate, setSelectedDate] = useState(null);
 const [calendarDate, setCalendarDate] = useState(new Date());
 const [showStats, setShowStats] = useState(false);
 const [statsPlayerFilter, setStatsPlayerFilter] = useState('');
 const [statsDateFrom, setStatsDateFrom] = useState('');
 const [statsDateTo, setStatsDateTo] = useState('');
 const [statsYearFilter, setStatsYearFilter] = useState('');
 const [statsMonthFilter, setStatsMonthFilter] = useState('');
 const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
 const [selectedWelcomePlayer, setSelectedWelcomePlayer] = useState('');
 const [welcomePin, setWelcomePin] = useState('');
 const [welcomeScreenError, setWelcomeScreenError] = useState('');
 const [loadedByPlayer, setLoadedByPlayer] = useState('');
 const [showFullRanking, setShowFullRanking] = useState({ played: false, won: false, lost: false, winPercentage: false });
 const [showNoCancheroScreen, setShowNoCancheroScreen] = useState(false);
 const [noCancheroError, setNoCancheroError] = useState('');
 const [noCancheroTeam1, setNoCancheroTeam1] = useState([]);
 const [noCancheroTeam2, setNoCancheroTeam2] = useState([]);
 const [noCancheroScore1, setNoCancheroScore1] = useState('');
 const [noCancheroScore2, setNoCancheroScore2] = useState('');
 const [noCancheroDate, setNoCancheroDate] = useState(new Date().toISOString().split('T')[0]);
 const [noCancheroLoadedBy, setNoCancheroLoadedBy] = useState('');
 const [showMatchList, setShowMatchList] = useState(false);
 const [matchesToShow, setMatchesToShow] = useState(10);

 useEffect(() => {
 const setupFirebase = async () => {
 try {
 await signInAnonymously(auth);
 } catch (error) {
 console.error("Error during Firebase anonymous authentication:", error);
 setErrorMessage("Error al iniciar la sesión anónima de Firebase.");
 }
 };
 setupFirebase();
 const unsubscribeAuth = onAuthStateChanged(auth, user => {
 if (user) {
 setUserId(user.uid);
 setLoading(false);
 } else {
 setUserId(null);
 setLoading(false);
 }
 });
 return () => unsubscribeAuth();
 }, []);

 useEffect(() => {
 const matchesCollectionRef = collection(db, `artifacts/${appId}/matches`);
 const deletedMatchesCollectionRef = collection(db, `artifacts/${appId}/deletedMatches`);
 const matchesQuery = query(matchesCollectionRef, limit(100));
 const deletedMatchesQuery = selectedDate
 ? query(deletedMatchesCollectionRef, where("originalMatch.date", "==", selectedDate), limit(100))
 : query(deletedMatchesCollectionRef, limit(100));
 const dailySummariesQuery = selectedDate
 ? query(collection(db, `artifacts/${appId}/dailySummaries`), where("date", "==", selectedDate), limit(100))
 : query(collection(db, `artifacts/${appId}/dailySummaries`), limit(100));

 const unsubscribeMatches = onSnapshot(matchesQuery, matchesSnapshot => {
 const fetchedMatches = matchesSnapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data(),
 team1Players: doc.data().team1Players || [],
 team2Players: doc.data().team2Players || [],
 date: doc.data().date || new Date().toISOString().split('T')[0],
 winner: doc.data().winner || 'N/A',
 comment: doc.data().comment || '',
 loadedBy: doc.data().loadedBy || 'Desconocido',
 timestamp: doc.data().timestamp || Timestamp.now(),
 editHistory: doc.data().editHistory || [],
 pendingConfirmation: doc.data().pendingConfirmation || false,
 isDeleted: false
 }));
 fetchedMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
 setMatches(fetchedMatches);
 setErrorMessage('');
 }, error => {
 console.error("Error fetching matches:", error);
 setErrorMessage("Error al cargar los partidos. Por favor, intenta de nuevo.");
 });

 const unsubscribeDeletedMatches = onSnapshot(deletedMatchesQuery, deletedSnapshot => {
 const fetchedDeletedMatches = deletedSnapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data().originalMatch,
 deletedBy: doc.data().deletedBy || 'Desconocido',
 deletedTimestamp: doc.data().deletedTimestamp || Timestamp.now(),
 pendingConfirmation: doc.data().originalMatch.pendingConfirmation || false,
 isDeleted: true
 }));
 setDeletedMatches(fetchedDeletedMatches);
 }, error => {
 console.error("Error fetching deleted matches:", error);
 setErrorMessage("Error al cargar los partidos eliminados. Por favor, intenta de nuevo.");
 });

 const unsubscribeDailySummaries = onSnapshot(dailySummariesQuery, { source: "cache" }, dailySummariesSnapshot => {
 const fetchedDailySummaries = {};
 dailySummariesSnapshot.forEach(doc => {
 const [docDate, player] = doc.id.split('_');
 if (!fetchedDailySummaries[docDate]) fetchedDailySummaries[docDate] = {};
 fetchedDailySummaries[docDate][player] = doc.data();
 });
 setFetchedDailySummaries(fetchedDailySummaries);
 }, error => {
 console.error("Error fetching daily summaries:", error);
 setErrorMessage("Error al cargar los resúmenes diarios.");
 });

 return () => {
 unsubscribeMatches();
 unsubscribeDeletedMatches();
 unsubscribeDailySummaries();
 };
 }, [selectedDate]);

 const groupedMatches = useMemo(() => {
 const grouped = {};
 const allMatches = [...matches, ...deletedMatches];
 allMatches.forEach(match => {
 const date = match.date || new Date().toISOString().split('T')[0];
 if (!grouped[date]) grouped[date] = { matches: [], summary: {} };
 grouped[date].matches.push(match);
 if (!match.isDeleted) {
 const allPlayersInMatch = [...(match.team1Players || []), ...(match.team2Players || [])];
 allPlayersInMatch.forEach(player => {
 if (!player) return;
 if (!grouped[date].summary[player]) {
 grouped[date].summary[player] = { played: 0, won: 0, lost: 0, paid: false, paymentHistory: [] };
 }
 grouped[date].summary[player].played++;
 if (fetchedDailySummaries[date] && fetchedDailySummaries[date][player]) {
 grouped[date].summary[player].paid = fetchedDailySummaries[date][player].paid;
 grouped[date].summary[player].paymentHistory = fetchedDailySummaries[date][player].paymentHistory || [];
 }
 });
 if (match.winner && match.winner !== 'Empate' && match.winner !== 'N/A') {
 if (match.winner.startsWith('Equipo 1')) {
 (match.team1Players || []).forEach(player => {
 if (player) grouped[date].summary[player].won++;
 });
 (match.team2Players || []).forEach(player => {
 if (player) grouped[date].summary[player].lost++;
 });
 } else if (match.winner.startsWith('Equipo 2')) {
 (match.team2Players || []).forEach(player => {
 if (player) grouped[date].summary[player].won++;
 });
 (match.team1Players || []).forEach(player => {
 if (player) grouped[date].summary[player].lost++;
 });
 }
 }
 }
 });
 Object.keys(grouped).forEach(date => {
 grouped[date].matches.sort((a, b) => {
 if (a.isDeleted === b.isDeleted) {
 return new Date(b.timestamp.toDate()) - new Date(a.timestamp.toDate());
 }
 return a.isDeleted ? 1 : -1;
 });
 });
 return grouped;
 }, [matches, deletedMatches, fetchedDailySummaries]);

 const handlePlayerDropdownChange = (e, playerKey, isEdit = false) => {
 const { value } = e.target;
 let currentMatchState = isEdit ? editedMatch : newMatch;
 let setMatchState = isEdit ? setEditedMatch : setNewMatch;
 if (value === 'Otro (escribir)') {
 setMatchState({ ...currentMatchState, [playerKey]: { value: '', type: 'custom' } });
 } else {
 setMatchState({ ...currentMatchState, [playerKey]: { value: value, type: 'dropdown' } });
 }
 };

 const handleCustomPlayerInputChange = (e, playerKey, isEdit = false) => {
 const { value } = e.target;
 let currentMatchState = isEdit ? editedMatch : newMatch;
 let setMatchState = isEdit ? setEditedMatch : setNewMatch;
 setMatchState({ ...currentMatchState, [playerKey]: { value: value, type: 'custom' } });
 };

 const handleNewMatchOtherInputChange = e => {
 const { name, value } = e.target;
 setNewMatch({ ...newMatch, [name]: value });
 };

 const handleEditedMatchOtherInputChange = e => {
 const { name, value } = e.target;
 setEditedMatch({ ...editedMatch, [name]: value });
 };

 const handlePaidChange = async (date, player, isPaid) => {
 if (!userId) {
 setErrorMessage("La aplicación no está lista. Por favor, espera o recarga.");
 return;
 }
 try {
 const dailySummaryDocRef = doc(db, `artifacts/${appId}/dailySummaries`, `${date}_${player}`);
 const paymentHistoryEntry = {
 changedBy: loadedByPlayer,
 action: isPaid ? 'Marcado como pagado' : 'Marcado como no pagado',
 timestamp: Timestamp.now()
 };
 await setDoc(dailySummaryDocRef, {
 date,
 player,
 paid: isPaid,
 paymentHistory: [...(groupedMatches[date]?.summary[player]?.paymentHistory || []), paymentHistoryEntry]
 }, { merge: true });
 setErrorMessage('');
 } catch (e) {
 console.error("Error updating paid status:", e);
 setErrorMessage("Error al actualizar el estado de pago. Intenta de nuevo.");
 }
 };

 const addMatch = async (isNoCanchero = false, team1Players, team2Players, score1, score2, date, comment, loadedBy) => {
 if (!userId) {
 setErrorMessage("La aplicación no está lista. Por favor, espera o recarga.");
 return;
 }
 const finalTeam1Players = team1Players || [newMatch.team1Player1.value, newMatch.team1Player2.value].filter(p => p);
 const finalTeam2Players = team2Players || [newMatch.team2Player1.value, newMatch.team2Player2.value].filter(p => p);
 const finalDate = date || newMatch.date;
 const finalComment = comment || newMatch.comment;
 const finalLoadedBy = isNoCanchero ? loadedBy : loadedByPlayer;

 if (finalTeam1Players.length !== 2 || finalTeam2Players.length !== 2 || !finalDate) {
 if (isNoCanchero) {
 setNoCancheroError("Por favor, completa todos los campos de jugadores y la fecha.");
 } else {
 setErrorMessage("Por favor, completa todos los campos de jugadores y la fecha.");
 }
 return;
 }
 if (finalTeam1Players[0] === finalTeam1Players[1]) {
 if (isNoCanchero) {
 setNoCancheroError("Los jugadores del Equipo 1 no pueden ser el mismo.");
 } else {
 setErrorMessage("Los jugadores del Equipo 1 no pueden ser el mismo.");
 }
 return;
 }
 if (finalTeam2Players[0] === finalTeam2Players[1]) {
 if (isNoCanchero) {
 setNoCancheroError("Los jugadores del Equipo 2 no pueden ser el mismo.");
 } else {
 setErrorMessage("Los jugadores del Equipo 2 no pueden ser el mismo.");
 }
 return;
 }
 const allPlayers = [...finalTeam1Players, ...finalTeam2Players];
 const uniquePlayers = new Set(allPlayers);
 if (uniquePlayers.size !== allPlayers.length) {
 if (isNoCanchero) {
 setNoCancheroError("Un jugador no puede estar en ambos equipos.");
 } else {
 setErrorMessage("Un jugador no puede estar en ambos equipos.");
 }
 return;
 }
 let scoreTeam1 = isNoCanchero ? score1 : newMatch.scoreTeam1;
 let scoreTeam2 = isNoCanchero ? score2 : newMatch.scoreTeam2;
 if (scoreTeam1 === '' || scoreTeam2 === '') {
 if (isNoCanchero) {
 setNoCancheroError("Los puntajes de ambos equipos son obligatorios.");
 } else {
 setErrorMessage("Los puntajes de ambos equipos son obligatorios.");
 }
 return;
 }
 scoreTeam1 = parseInt(scoreTeam1);
 scoreTeam2 = parseInt(scoreTeam2);
 if (isNaN(scoreTeam1) || scoreTeam1 < 0) {
 if (isNoCanchero) {
 setNoCancheroError("La puntuación del Equipo 1 debe ser un número válido y no negativo.");
 } else {
 setErrorMessage("La puntuación del Equipo 1 debe ser un número válido y no negativo.");
 }
 return;
 }
 if (isNaN(scoreTeam2) || scoreTeam2 < 0) {
 if (isNoCanchero) {
 setNoCancheroError("La puntuación del Equipo 2 debe ser un número válido y no negativo.");
 } else {
 setErrorMessage("La puntuación del Equipo 2 debe ser un número válido y no negativo.");
 }
 return;
 }
 let winner = 'Empate';
 if (scoreTeam1 > scoreTeam2) {
 winner = `Equipo 1 (${finalTeam1Players.join(' y ')})`;
 } else if (scoreTeam2 > scoreTeam1) {
 winner = `Equipo 2 (${finalTeam2Players.join(' y ')})`;
 }
 try {
 await addDoc(collection(db, `artifacts/${appId}/matches`), {
 team1Players: finalTeam1Players,
 team2Players: finalTeam2Players,
 scoreTeam1,
 scoreTeam2,
 date: finalDate,
 comment: finalComment,
 winner,
 loadedBy: finalLoadedBy,
 timestamp: Timestamp.now(),
 editHistory: [],
 pendingConfirmation: isNoCanchero,
 isDeleted: false
 });
 if (!isNoCanchero) {
 setNewMatch({
 team1Player1: { value: '', type: 'dropdown' },
 team1Player2: { value: '', type: 'dropdown' },
 team2Player1: { value: '', type: 'dropdown' },
 team2Player2: { value: '', type: 'dropdown' },
 scoreTeam1: '',
 scoreTeam2: '',
 comment: '',
 date: new Date().toISOString().split('T')[0],
 });
 }
 setErrorMessage('');
 if (isNoCanchero) {
 alert('Partido cargado a confirmar por un admin');
 setNoCancheroError('');
 setShowNoCancheroScreen(false);
 setNoCancheroTeam1([]);
 setNoCancheroTeam2([]);
 setNoCancheroScore1('');
 setNoCancheroScore2('');
 setNoCancheroDate(new Date().toISOString().split('T')[0]);
 setNoCancheroLoadedBy('');
 }
 } catch (e) {
 console.error("Error adding document: ", e);
 if (isNoCanchero) {
 setNoCancheroError("Error al guardar el partido. Intenta de nuevo.");
 } else {
 setErrorMessage("Error al guardar el partido. Intenta de nuevo.");
 }
 }
 };

 const confirmMatch = async matchId => {
 if (!userId) {
 setErrorMessage("La aplicación no está lista. Por favor, espera o recarga.");
 return;
 }
 try {
 await updateDoc(doc(db, `artifacts/${appId}/matches`, matchId), {
 pendingConfirmation: false,
 editHistory: [...(matches.find(m => m.id === matchId)?.editHistory || []), {
 editedBy: loadedByPlayer,
 editedTimestamp: Timestamp.now(),
 changes: ['Partido confirmado']
 }]
 });
 setErrorMessage('');
 } catch (e) {
 console.error("Error confirming match: ", e);
 setErrorMessage("Error al confirmar el partido. Intenta de nuevo.");
 }
 };

 const confirmDeleteMatch = match => {
 setMatchToDelete(match);
 setShowConfirmModal(true);
 };

 const deleteMatch = async () => {
 if (!userId || !matchToDelete) return;
 try {
 await addDoc(collection(db, `artifacts/${appId}/deletedMatches`), {
 originalMatch: { ...matchToDelete, isDeleted: true },
 deletedBy: loadedByPlayer,
 deletedTimestamp: Timestamp.now()
 });
 await deleteDoc(doc(db, `artifacts/${appId}/matches`, matchToDelete.id));
 setShowConfirmModal(false);
 setMatchToDelete(null);
 setErrorMessage('');
 } catch (e) {
 console.error("Error deleting document: ", e);
 setErrorMessage("Error al eliminar el partido. Intenta de nuevo.");
 }
 };

 const startEditing = match => {
 if (!userId) {
 setErrorMessage("La aplicación no está lista. Por favor, espera o recarga.");
 return;
 }
 const transformedEditedMatch = {
 ...match,
 team1Player1: { value: match.team1Players[0] || '', type: isPredefinedPlayer(match.team1Players[0]) ? 'dropdown' : 'custom' },
 team1Player2: { value: match.team1Players[1] || '', type: isPredefinedPlayer(match.team1Players[1]) ? 'dropdown' : 'custom' },
 team2Player1: { value: match.team2Players[0] || '', type: isPredefinedPlayer(match.team2Players[0]) ? 'dropdown' : 'custom' },
 team2Player2: { value: match.team2Players[1] || '', type: isPredefinedPlayer(match.team2Players[1]) ? 'dropdown' : 'custom' },
 comment: match.comment || ''
 };
 setEditingMatchId(match.id);
 setEditedMatch(transformedEditedMatch);
 };

 const cancelEditing = () => {
 setEditingMatchId(null);
 setEditedMatch(null);
 setErrorMessage('');
 };

 const saveEditedMatch = async () => {
 if (!userId || !editedMatch) return;
 const team1Players = [editedMatch.team1Player1.value, editedMatch.team1Player2.value].filter(p => p);
 const team2Players = [editedMatch.team2Player1.value, editedMatch.team2Player2.value].filter(p => p);
 const { date, comment } = editedMatch;
 if (team1Players.length !== 2 || team2Players.length !== 2 || !date) {
 setErrorMessage("Por favor, completa todos los campos de jugadores y la fecha para editar.");
 return;
 }
 if (team1Players[0] === team1Players[1]) {
 setErrorMessage("Los jugadores del Equipo 1 no pueden ser el mismo.");
 return;
 }
 if (team2Players[0] === team2Players[1]) {
 setErrorMessage("Los jugadores del Equipo 2 no pueden ser el mismo.");
 return;
 }
 const allPlayers = [...team1Players, ...team2Players];
 const uniquePlayers = new Set(allPlayers);
 if (uniquePlayers.size !== allPlayers.length) {
 setErrorMessage("Un jugador no puede estar en ambos equipos.");
 return;
 }
 let score1 = editedMatch.scoreTeam1;
 let score2 = editedMatch.scoreTeam2;
 if (score1 === '' || score2 === '') {
 setErrorMessage("Los puntajes de ambos equipos son obligatorios.");
 return;
 }
 score1 = parseInt(score1);
 score2 = parseInt(score2);
 if (isNaN(score1) || score1 < 0) {
 setErrorMessage("La puntuación del Equipo 1 debe ser un número válido y no negativo.");
 return;
 }
 if (isNaN(score2) || score2 < 0) {
 setErrorMessage("La puntuación del Equipo 2 debe ser un número válido y no negativo.");
 return;
 }
 let winner = 'Empate';
 if (score1 > score2) {
 winner = `Equipo 1 (${team1Players.join(' y ')})`;
 } else if (score2 > score1) {
 winner = `Equipo 2 (${team2Players.join(' y ')})`;
 }
 const originalMatch = matches.find(m => m.id === editedMatch.id);
 const changes = [];
 if (originalMatch) {
 if (originalMatch.team1Players.join() !== team1Players.join()) {
 changes.push(`Equipo 1 cambiado de ${originalMatch.team1Players.join(' y ')} a ${team1Players.join(' y ')}`);
 }
 if (originalMatch.team2Players.join() !== team2Players.join()) {
 changes.push(`Equipo 2 cambiado de ${originalMatch.team2Players.join(' y ')} a ${team2Players.join(' y ')}`);
 }
 if (originalMatch.scoreTeam1 !== score1) {
 changes.push(`Puntuación Equipo 1 cambiada de ${originalMatch.scoreTeam1 || 'N/A'} a ${score1}`);
 }
 if (originalMatch.scoreTeam2 !== score2) {
 changes.push(`Puntuación Equipo 2 cambiada de ${originalMatch.scoreTeam2 || 'N/A'} a ${score2}`);
 }
 if (originalMatch.date !== date) {
 changes.push(`Fecha cambiada de ${originalMatch.date} a ${date}`);
 }
 if (originalMatch.comment !== comment) {
 changes.push(`Comentario cambiado de "${originalMatch.comment || 'N/A'}" a "${comment || 'N/A'}"`);
 }
 }
 try {
 const newEditEntry = { editedBy: loadedByPlayer, editedTimestamp: Timestamp.now(), changes: changes.length > 0 ? changes : ['Edición menor'] };
 await updateDoc(doc(db, `artifacts/${appId}/matches`, editedMatch.id), {
 team1Players,
 team2Players,
 scoreTeam1: score1,
 scoreTeam2: score2,
 date,
 comment,
 winner,
 editHistory: [...(editedMatch.editHistory || []), newEditEntry],
 pendingConfirmation: originalMatch.pendingConfirmation || false,
 isDeleted: false
 });
 setEditingMatchId(null);
 setEditedMatch(null);
 setErrorMessage('');
 } catch (e) {
 console.error("Error updating document: ", e);
 setErrorMessage("Error al actualizar el partido. Intenta de nuevo.");
 }
 };

 const downloadMatchHistory = () => {
 if (matches.length === 0 && deletedMatches.length === 0) {
 setErrorMessage("No hay partidos para descargar.");
 return;
 }
 const headers = ["Número", "Fecha", "Equipo 1 - Jugador 1", "Equipo 1 - Jugador 1 Pagó?", "Equipo 1 - Jugador 2", "Equipo 1 - Jugador 2 Pagó?", "Equipo 2 - Jugador 1", "Equipo 2 - Jugador 1 Pagó?", "Equipo 2 - Jugador 2", "Equipo 2 - Jugador 2 Pagó?", "Equipo 1 Puntuación", "Equipo 2 Puntuación", "Equipo 1 - Ganó?", "Equipo 2 - Ganó?", "Comentario", "Cargado por", "Estado", "Eliminado por", "Fecha de Eliminación", "Pendiente de Confirmación", "Historial de Ediciones", "Historial de Pagos"];
 const allMatches = [...matches, ...deletedMatches];
 const rows = allMatches.map((match, index) => {
 const team1Player1Paid = groupedMatches[match.date]?.summary[match.team1Players[0]]?.paid ? 'Sí' : 'No';
 const team1Player2Paid = groupedMatches[match.date]?.summary[match.team1Players[1]]?.paid ? 'Sí' : 'No';
 const team2Player1Paid = groupedMatches[match.date]?.summary[match.team2Players[0]]?.paid ? 'Sí' : 'No';
 const team2Player2Paid = groupedMatches[match.date]?.summary[match.team2Players[1]]?.paid ? 'Sí' : 'No';
 const score1 = match.scoreTeam1 !== '' ? match.scoreTeam1 : 'N/A';
 const score2 = match.scoreTeam2 !== '' ? match.scoreTeam2 : 'N/A';
 const team1Won = match.winner && match.winner.startsWith('Equipo 1') ? 'Sí' : 'No';
 const team2Won = match.winner && match.winner.startsWith('Equipo 2') ? 'Sí' : 'No';
 const loadedBy = match.loadedBy || 'Desconocido';
 const comment = match.comment || '';
 const status = match.isDeleted ? 'Dado de Baja' : 'Activo';
 const deletedBy = match.isDeleted ? match.deletedBy || 'Desconocido' : '';
 const deletedTimestamp = match.isDeleted && match.deletedTimestamp ? new Date(match.deletedTimestamp.toDate()).toLocaleString() : '';
 const pendingConfirmation = match.pendingConfirmation ? 'Sí' : 'No';
 const editHistoryString = (match.editHistory || []).map(edit => `${edit.editedBy} (${new Date(edit.editedTimestamp.toDate()).toLocaleString()}): ${edit.changes.join(', ')}`).join('; ');
 const paymentHistoryString = [
 ...(groupedMatches[match.date]?.summary[match.team1Players[0]]?.paymentHistory || []),
 ...(groupedMatches[match.date]?.summary[match.team1Players[1]]?.paymentHistory || []),
 ...(groupedMatches[match.date]?.summary[match.team2Players[0]]?.paymentHistory || []),
 ...(groupedMatches[match.date]?.summary[match.team2Players[1]]?.paymentHistory || [])
 ].map(entry => `${entry.changedBy} (${new Date(entry.timestamp.toDate()).toLocaleString()}): ${entry.action}`).join('; ');
 return [
 index + 1, match.date, match.team1Players[0] || 'N/A', team1Player1Paid, match.team1Players[1] || 'N/A', team1Player2Paid,
 match.team2Players[0] || 'N/A', team2Player1 Paid, match.team2Players[1] || 'N/A', team2Player2Paid, score1, score2, team1Won, team2Won,
 comment, loadedBy, status, deletedBy, deletedTimestamp, pendingConfirmation, editHistoryString, paymentHistoryString
 ].map(item => `"${String(item).replace(/"/g, '""')}"`).join(',');
 });
 const csvContent = [headers.map(header => `"${header}"`).join(','), ...rows].join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 link.href = URL.createObjectURL(blob);
 link.setAttribute('download', 'historial_partidos_pelota_paleta.csv');
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 setErrorMessage('Historial descargado exitosamente.');
 };

 const handleWelcomeEnter = () => {
 setWelcomeScreenError('');
 if (selectedWelcomePlayer === '') {
 setWelcomeScreenError('Por favor, selecciona un jugador para ingresar.');
 return;
 }
 const expectedPin = playerPins[selectedWelcomePlayer];
 if (!expectedPin) {
 setWelcomeScreenError('PIN no configurado para este jugador. Contacta al administrador.');
 return;
 }
 if (welcomePin !== expectedPin) {
 setWelcomeScreenError('PIN incorrecto. Intenta de nuevo.');
 setWelcomePin('');
 return;
 }
 setLoadedByPlayer(selectedWelcomePlayer);
 setShowWelcomeScreen(false);
 setShowStats(false);
 setWelcomePin('');
 };

 const handleExitApp = () => {
 setShowWelcomeScreen(true);
 setSelectedWelcomePlayer('');
 setWelcomePin('');
 setLoadedByPlayer('');
 setErrorMessage('');
 setWelcomeScreenError('');
 setNewMatch({
 team1Player1: { value: '', type: 'dropdown' },
 team1Player2: { value: '', type: 'dropdown' },
 team2Player1: { value: '', type: 'dropdown' },
 team2Player2: { value: '', type: 'dropdown' },
 scoreTeam1: '',
 scoreTeam2: '',
 comment: '',
 date: new Date().toISOString().split('T')[0],
 });
 setEditingMatchId(null);
 setEditedMatch(null);
 setSelectedDate(null);
 setShowStats(false);
 setStatsYearFilter('');
 setStatsMonthFilter('');
 setShowNoCancheroScreen(false);
 setNoCancheroTeam1([]);
 setNoCancheroTeam2([]);
 setNoCancheroScore1('');
 setNoCancheroScore2('');
 setNoCancheroDate(new Date().toISOString().split('T')[0]);
 setNoCancheroLoadedBy('');
 setShowMatchList(false);
 setMatchesToShow(10);
 };

 const handleShowStats = () => {
 setShowStats(true);
 setShowWelcomeScreen(false);
 };

 const filteredMatches = matches.filter(match => {
 if (!match || !match.date || !match.team1Players || !match.team2Players || match.isDeleted) return false;
 let matchesPlayer = !statsPlayerFilter || (match.team1Players.includes(statsPlayerFilter) || match.team2Players.includes(statsPlayerFilter));
 let matchesDate = true;
 if (statsDateFrom && statsDateTo) {
 matchesDate = match.date >= statsDateFrom && match.date <= statsDateTo;
 } else if (statsDateFrom) {
 matchesDate = match.date >= statsDateFrom;
 } else if (statsDateTo) {
 matchesDate = match.date <= statsDateTo;
 }
 let matchesYear = true;
 if (statsYearFilter) {
 matchesYear = match.date.startsWith(statsYearFilter);
 }
 let matchesMonth = true;
 if (statsMonthFilter) {
 const month = parseInt(statsMonthFilter).toString().padStart(2, '0');
 matchesMonth = match.date.includes(`-${month}-`);
 }
 return matchesPlayer && matchesDate && matchesYear && matchesMonth;
 });

 const statsSummary = useMemo(() => {
 const summary = {};
 filteredMatches.forEach(match => {
 if (!match || !match.team1Players || !match.team2Players) return;
 const allPlayers = [...match.team1Players, ...match.team2Players];
 allPlayers.forEach(player => {
 if (!player) return;
 if (!summary[player]) {
 summary[player] = { played: 0, won: 0, lost: 0 };
 }
 summary[player].played++;
 if (match.winner && match.winner !== 'Empate' && match.winner !== 'N/A') {
 if (match.winner.startsWith('Equipo 1')) {
 if (match.team1Players.includes(player)) {
 summary[player].won++;
 } else if (match.team2Players.includes(player)) {
 summary[player].lost++;
 }
 } else if (match.winner.startsWith('Equipo 2')) {
 if (match.team2Players.includes(player)) {
 summary[player].won++;
 } else if (match.team1Players.includes(player)) {
 summary[player].lost++;
 }
 }
 }
 });
 });
 Object.keys(summary).forEach(player => {
 const { played, won } = summary[player];
 summary[player].winPercentage = played > 0 ? ((won / played) * 100).toFixed(2) : '0.00';
 });
 return summary;
 }, [filteredMatches]);

 const rankings = useMemo(() => {
 const playedRanking = Object.entries(statsSummary)
 .map(([player, stats]) => ({ player, ...stats }))
 .sort((a, b) => b.played - a.played || a.player.localeCompare(b.player));
 const wonRanking = Object.entries(statsSummary)
 .map(([player, stats]) => ({ player, ...stats }))
 .sort((a, b) => b.won - a.won || a.player.localeCompare(b.player));
 const lostRanking = Object.entries(statsSummary)
 .map(([player, stats]) => ({ player, ...stats }))
 .sort((a, b) => b.lost - a.lost || a.player.localeCompare(b.player));
 const winPercentageRanking = Object.entries(statsSummary)
 .map(([player, stats]) => ({ player, ...stats }))
 .sort((a, b) => {
 const winDiff = parseFloat(b.winPercentage) - parseFloat(a.winPercentage);
 if (winDiff !== 0) return winDiff;
 return b.played - a.played;
 });
 return { playedRanking, wonRanking, lostRanking, winPercentageRanking };
 }, [statsSummary]);

 const availableYears = useMemo(() => {
 const years = new Set();
 matches.forEach(match => {
 if (match.date) years.add(match.date.split('-')[0]);
 });
 return Array.from(years).sort((a, b) => b - a);
 }, [matches]);

 const tileContent = ({ date, view }) => {
 if (view !== 'month') return null;
 const dateStr = date.toISOString().split('T')[0];
 const matchCount = groupedMatches[dateStr]?.matches.length || 0;
 return matchCount > 0 ? (
 <p className="text-xs text-blue-600 font-bold">{matchCount} partido{matchCount > 1 ? 's' : ''}</p>
 ) : null;
 };

 const tileClassName = ({ date, view }) => {
 if (view !== 'month') return '';
 const dateStr = date.toISOString().split('T')[0];
 const hasPending = groupedMatches[dateStr]?.matches.some(match => match.pendingConfirmation && !match.isDeleted);
 const hasMatches = groupedMatches[dateStr]?.matches.length > 0;
 return hasPending ? 'pending-confirmation' : hasMatches ? 'has-matches' : '';
 };

 const handleCalendarChange = (date) => {
 setCalendarDate(date);
 setSelectedDate(date.toISOString().split('T')[0]);
 };

 const renderLogos = () => (
 <div className="flex justify-center items-center space-x-4 mb-6">
 <img src="/logo.png" alt="Logo" className="h-12" />
 <img src="/logo2.png" alt="Logo 2" className="h-12" />
 </div>
 );

 if (loading) {
 return (
 <div className="flex-grow flex items-center justify-center">
 <p className="text-lg text-gray-700">Cargando...</p>
 </div>
 );
 }

 if (showWelcomeScreen) {
 return (
 <ErrorBoundary>
 <div className="min-h-screen flex flex-col justify-between bg-gray-100">
 <div className="flex-grow flex items-center justify-center">
 {showNoCancheroScreen ? (
 <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
 {renderLogos()}
 <h2 className="text-2xl font-semibold text-blue-700 mb-8">Cargar Partido sin Canchero</h2>
 {noCancheroError && (
 <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
 <strong className="font-bold">Error:</strong>
 <span className="block sm:inline"> {noCancheroError}</span>
 </div>
 )}
 <div className="mb-6">
 <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 1 (selecciona hasta 2 jugadores):</label>
 <select
 multiple
 value={noCancheroTeam1}
 onChange={(e) => {
 const selected = Array.from(e.target.selectedOptions, option => option.value);
 if (selected.length <= 2) {
 setNoCancheroTeam1(selected);
 } else {
 setNoCancheroError('Máximo 2 jugadores por equipo.');
 }
 }}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
 >
 {welcomePlayerList.map((player, index) => (
 <option key={index} value={player}>{player}</option>
 ))}
 </select>
 </div>
 <div className="mb-6">
 <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 2 (selecciona hasta 2 jugadores):</label>
 <select
 multiple
 value={noCancheroTeam2}
 onChange={(e) => {
 const selected = Array.from(e.target.selectedOptions, option => option.value);
 if (selected.length <= 2) {
 setNoCancheroTeam2(selected);
 } else {
 setNoCancheroError('Máximo 2 jugadores por equipo.');
 }
 }}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
 >
 {welcomePlayerList.map((player, index) => (
 <option key={index} value={player}>{player}</option>
 ))}
 </select>
 </div>
 <div className="mb-6">
 <label className="block text-gray-700 text-lg font-bold mb-3">Puntaje Equipo 1:</label>
 <input
 type="number"
 value={ noCancheroScore1}
 onChange={(e) => setNoCancheroScore1(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
 placeholder="Puntaje"
 required
 />
 </div>
 <div className="mb-6">
 <label className="block text-gray-700 text-lg font-bold mb-3">Puntaje Equipo 2:</label>
 <input
 type="number"
 value={noCancheroScore2}
 onChange={(e) => setNoCancheroScore2(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
 placeholder="Puntaje"
 required
 />
 </div>
 <div className="mb-6">
 <label className="block text-gray-700 text-lg font-bold mb-3">Fecha:</label>
 <input
 type="date"
 value={noCancheroDate}
 onChange={(e) => setNoCancheroDate(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
 />
 </div>
 <div className="mb-6">
 <label className="block text-gray-700 text-lg font-bold mb-3">¿Quién Carga?:</label>
 <input
 type="text"
 value={noCancheroLoadedBy}
 onChange={(e) => setNoCancheroLoadedBy(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
 placeholder="Nombre de quien carga"
 />
 </div>
 <div className="flex flex-col space-y-4">
 <button
 onClick={() => {
 if (noCancheroTeam1.length !== 2 || noCancheroTeam2.length !== 2) {
 setNoCancheroError('Selecciona exactamente 2 jugadores por equipo.');
 return;
 }
 if (!noCancheroScore1 || !noCancheroScore2) {
 setNoCancheroError('Ingresa los puntajes de ambos equipos.');
 return;
 }
 if (!noCancheroLoadedBy.trim()) {
 setNoCancheroError('Ingresa quién carga el partido.');
 return;
 }
 addMatch(
 true,
 noCancheroTeam1,
 noCancheroTeam2,
 parseInt(noCancheroScore1),
 parseInt(noCancheroScore2),
 noCancheroDate,
 '',
 noCancheroLoadedBy.trim()
 );
 }}
 className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
 >
 <PlusCircle className="mr-3" size={24} /> Agregar Partido
 </button>
 <button
 onClick={() => setShowNoCancheroScreen(false)}
 className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
 >
 <XCircle className="mr-3" size={24} /> Volver
 </button>
 </div>
 </div>
 ) : (
 <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
 {renderLogos()}
 <h2 className="text-2xl font-semibold text-blue-700 mb-8">Registro Diario</h2>
 {welcomeScreenError && (
 <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
 <strong className="font-bold">Error:</strong>
 <span className="block sm:inline"> {welcomeScreenError}</span>
 </div>
 )}
 <div className="mb-6">
 <label className="block text-gray-700 text-lg font-bold mb-3">Selecciona tu nombre:</label>
 <select
 value={selectedWelcomePlayer}
 onChange={(e) => setSelectedWelcomePlayer(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
 >
 <option value="">Selecciona un jugador</option>
 {welcomePlayerList.map((player, index) => (
 <option key={index} value={player}>{player}</option>
 ))}
 </select>
 </div>
 <div className="mb-6">
 <label className="block text-gray-700 text-lg font-bold mb-3">Ingresa tu PIN:</label>
 <input
 type="password"
 value={welcomePin}
 onChange={(e) => setWelcomePin(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
 placeholder="PIN"
 />
 </div>
 <div className="flex flex-col space-y-4">
 <button
 onClick={handleWelcomeEnter}
 className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
 >
 <LogIn className="mr-3" size={24} /> Ingresar
 </button>
 <button
 onClick={() => setShowNoCancheroScreen(true)}
 className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
 >
 <PlusCircle className="mr-3" size={24} /> Partido sin Canchero
 </button>
 <button
 onClick={handleShowStats}
 className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
 >
 <BarChart2 className="mr-3" size={24} /> Ver Estadísticas
 </button>
 </div>
 </div>
 )}
 </div>
 <CopyrightFooter />
 </div>
 </ErrorBoundary>
 );
 }

 if (showStats) {
 return (
 <ErrorBoundary>
 <div className="min-h-screen flex flex-col justify-between bg-gray-100">
 <div className="flex-grow container mx-auto px-4 py-6">
 {renderLogos()}
 <h1 className="text-3xl font-bold text-center text-blue-800 mb-6">Estadísticas de Pelota Paleta</h1>
 {errorMessage && (
 <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
 <strong className="font-bold">Error:</strong>
 <span className="block sm:inline"> {errorMessage}</span>
 </div>
 )}
 <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-gray-700 text-lg font-bold mb-3">Filtrar por Jugador:</label>
 <select
 value={statsPlayerFilter}
 onChange={(e) => setStatsPlayerFilter(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
 >
 <option value="">Todos los jugadores</option>
 {playerList.map((player, index) => (
 <option key={index} value={player}>{player}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-gray-700 text-lg font-bold mb-3">Desde:</label>
 <input
 type="date"
 value={statsDateFrom}
 onChange={(e) => setStatsDateFrom(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
 />
 </div>
 <div>
 <label className="block text-gray-700 text-lg font-bold mb-3">Hasta:</label>
 <input
 type="date"
 value={statsDateTo}
 onChange={(e) => setStatsDateTo(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
 />
 </div>
 <div>
 <label className="block text-gray-700 text-lg font-bold mb-3">Filtrar por Año:</label>
 <select
 value={statsYearFilter}
 onChange={(e) => setStatsYearFilter(e.target.value)}
 className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
 >
 <option value="">Todos los años</option>
 {availableYears.map((year, index) => (
 <option key={index} value={year}>{year}</option>
 ))}
 </select>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 {[
 { title: 'Top 10 Partidos Jugados', key: 'played', data: rankings.playedRanking },
 { title: 'Top 10 Partidos Ganados', key: 'won', data: rankings.wonRanking },
 { title: 'Top 10 Partidos Perdidos', key: 'lost', data: rankings.lostRanking },
 { title: 'Top 10 Porcentaje de Victorias', key: 'winPercentage', data: rankings.winPercentageRanking, suffix: '%' },
 ].map(({ title, key, data, suffix }) => (
 <div key={key} className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
 <h3 className="text-lg font-semibold text-blue-700 mb-2">{title}</h3>
 <div className="max-h-96 overflow-y-auto">
 {(showFullRanking[key] ? data : data.slice(0, 10)).map((entry, index) => (
 <div key={index} className="flex justify-between text-sm text-gray-700 mb-1">
 <span>{index + 1}. {entry.player}</span>
 <span>{entry[key]}{suffix || ''} {key === 'winPercentage' && `(${entry.played} partidos)`}</span>
 </div>
 ))}
 </div>
 {data.length > 10 && (
 <button
 onClick={() => setShowFullRanking(prev => ({ ...prev, [key]: !prev[key] }))}
 className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-full text-sm focus:outline-none focus:shadow-outline"
 >
 {showFullRanking[key] ? 'Ver Menos' : 'Ver Todo'}
 </button>
 )}
 </div>
 ))}
 </div>
 <button
 onClick={() => setShowMatchList(!showMatchList)}
 className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full max-w-xs mx-auto transform transition-transform duration-200 hover:scale-105 text-xl mb-6"
 >
 {showMatchList ? 'Ocultar Lista de Partidos' : 'Mostrar Lista de Partidos'}
 </button>
 {showMatchList && (
 <>
 <h2 className="text-2xl font-semibold text-blue-700 mb-4">Lista de Partidos</h2>
 {filteredMatches.length === 0 ? (
 <p className="text-gray-500">No hay partidos para los filtros seleccionados.</p>
 ) : (
 <div className="grid grid-cols-1 gap-3">
 {filteredMatches.slice(0, matchesToShow).map((match, index) => (
 <div key={match.id} className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-100">
 <p className="text-md font-semibold text-blue-800 mb-1">
 #{index + 1} - {match.date}: {(match.team1Players || []).join(' y ') || 'N/A'} vs {(match.team2Players || []).join(' y ') || 'N/A'}
 </p>
 <p className="text-lg font-bold text-blue-600 mb-1">
 Resultado: {match.scoreTeam1 !== '' && match.scoreTeam2 !== '' ? `${match.scoreTeam1} - ${match.scoreTeam2}` : 'Puntuación no registrada'}
 </p>
 <p className="text-sm text-green-700 font-semibold mb-2">
 Ganador: {match.winner || 'No determinado'}
 </p>
 {match.comment && (
 <p className="text-sm text-gray-600 mb-2">Comentario: {match.comment}</p>
 )}
 <p className="text-xs text-gray-500 mt-1">
 Cargado por: <span className="font-semibold">{match.loadedBy || 'Desconocido'}</span> el <span className="font-semibold">{match.timestamp ? new Date(match.timestamp.toDate()).toLocaleString() : 'N/A'}</span>
 </p>
 {match.editHistory && match.editHistory.length > 0 && (
 <div className="text-xs text-gray-500 mt-1">
 Historial de Ediciones:
 <ul className="list-disc list-inside ml-2">
 {match.editHistory.map((edit, idx) => (
 <li key={idx}>
 <span className="font-semibold">{edit.editedBy}</span> el <span className="font-semibold">{edit.editedTimestamp ? new Date(edit.editedTimestamp.toDate()).toLocaleString() : 'N/A'}</span>: {edit.changes.join(', ')}
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 ))}
 {filteredMatches.length > matchesToShow && (
 <button
 onClick={() => setMatchesToShow(matchesToShow + 10)}
 className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full max-w-xs mx-auto transform transition-transform duration-200 hover:scale-105"
 >
 Cargar Más
 </button>
 )}
 </div>
 )}
 </>
 )}
 <button
 onClick={handleExitApp}
 className="mt-6 bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full max-w -xs mx-auto transform transition-transform duration-200 hover:scale-105 text-xl"
 >
 <LogOut className="mr-3" size={24} /> Salir
 </button>
 </div>
 <CopyrightFooter />
 </div>
 </ErrorBoundary>
 );
 }

    return (
        <ErrorBoundary>
            <div className="min-h-screen flex flex-col justify-between bg-gray-100">
                <div className="flex-grow container mx-auto px-4 py-6">
                    {renderLogos()}
                    <h1 className="text-3xl font-bold text-center text-blue-800 mb-6">Registro de Pelota Paleta</h1>
                    {errorMessage && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                            <strong className="font-bold">Error:</strong>
                            <span className="block sm:inline"> {errorMessage}</span>
                        </div>
                    )}
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-blue-700 mb-4">Seleccionar Fecha</h2>
                        <Calendar
                            onChange={handleCalendarChange}
                            value={calendarDate}
                            tileContent={tileContent}
                            tileClassName={tileClassName}
                            className="mx-auto"
                        />
                    </div>
                    {editingMatchId ? (
                        <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
                            <h2 className="text-2xl font-semibold text-blue-700 mb-4">Editar Partido</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 1 - Jugador 1:</label>
                                    {editedMatch.team1Player1.type === 'dropdown' ? (
                                        <select
                                            value={editedMatch.team1Player1.value}
                                            onChange={(e) => handlePlayerDropdownChange(e, 'team1Player1', true)}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                        >
                                            <option value="">Selecciona un jugador</option>
                                            {playerList.map((player, index) => (
                                                <option key={index} value={player}>{player}</option>
                                            ))}
                                            <option value="Otro (escribir)">Otro (escribir)</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={editedMatch.team1Player1.value}
                                            onChange={(e) => handleCustomPlayerInputChange(e, 'team1Player1', true)}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                            placeholder="Nombre del jugador"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 1 - Jugador 2:</label>
                                    {editedMatch.team1Player2.type === 'dropdown' ? (
                                        <select
                                            value={editedMatch.team1Player2.value}
                                            onChange={(e) => handlePlayerDropdownChange(e, 'team1Player2', true)}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                        >
                                            <option value="">Selecciona un jugador</option>
                                            {playerList.map((player, index) => (
                                                <option key={index} value={player}>{player}</option>
                                            ))}
                                            <option value="Otro (escribir)">Otro (escribir)</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={editedMatch.team1Player2.value}
                                            onChange={(e) => handleCustomPlayerInputChange(e, 'team1Player2', true)}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                            placeholder="Nombre del jugador"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 2 - Jugador 1:</label>
                                    {editedMatch.team2Player1.type === 'dropdown' ? (
                                        <select
                                            value={editedMatch.team2Player1.value}
                                            onChange={(e) => handlePlayerDropdownChange(e, 'team2Player1', true)}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                        >
                                            <option value="">Selecciona un jugador</option>
                                            {playerList.map((player, index) => (
                                                <option key={index} value={player}>{player}</option>
                                            ))}
                                            <option value="Otro (escribir)">Otro (escribir)</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={editedMatch.team2Player1.value}
                                            onChange={(e) => handleCustomPlayerInputChange(e, 'team2Player1', true)}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                            placeholder="Nombre del jugador"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 2 - Jugador 2:</label>
                                    {editedMatch.team2Player2.type === 'dropdown' ? (
                                        <select
                                            value={editedMatch.team2Player2.value}
                                            onChange={(e) => handlePlayerDropdownChange(e, 'team2Player2', true)}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                        >
                                            <option value="">Selecciona un jugador</option>
                                            {playerList.map((player, index) => (
                                                <option key={index} value={player}>{player}</option>
                                            ))}
                                            <option value="Otro (escribir)">Otro (escribir)</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={editedMatch.team2Player2.value}
                                            onChange={(e) => handleCustomPlayerInputChange(e, 'team2Player2', true)}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                            placeholder="Nombre del jugador"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Puntaje Equipo 1:</label>
                                    <input
                                        type="number"
                                        name="scoreTeam1"
                                        value={editedMatch.scoreTeam1}
                                        onChange={handleEditedMatchOtherInputChange}
                                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
                                        placeholder="Puntaje"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Puntaje Equipo 2:</label>
                                    <input
                                        type="number"
                                        name="scoreTeam2"
                                        value={editedMatch.scoreTeam2}
                                        onChange={handleEditedMatchOtherInputChange}
                                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
                                        placeholder="Puntaje"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Fecha:</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={editedMatch.date}
                                        onChange={handleEditedMatchOtherInputChange}
                                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Comentario:</label>
                                    <input
                                        type="text"
                                        name="comment"
                                        value={editedMatch.comment}
                                        onChange={handleEditedMatchOtherInputChange}
                                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
                                        placeholder="Comentario opcional"
                                    />
                                </div>
                            </div>
                            <div className="flex space-x-4 mt-6">
                                <button
                                    onClick={saveEditedMatch}
                                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                                >
                                    <Save className="mr-3" size={24} /> Guardar
                                </button>
                                <button
                                    onClick={cancelEditing}
                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                                >
                                    <XCircle className="mr-3" size={24} /> Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
                            <h2 className="text-2xl font-semibold text-blue-700 mb-4">Agregar Partido</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 1 - Jugador 1:</label>
                                    {newMatch.team1Player1.type === 'dropdown' ? (
                                        <select
                                            value={newMatch.team1Player1.value}
                                            onChange={(e) => handlePlayerDropdownChange(e, 'team1Player1')}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                        >
                                            <option value="">Selecciona un jugador</option>
                                            {playerList.map((player, index) => (
                                                <option key={index} value={player}>{player}</option>
                                            ))}
                                            <option value="Otro (escribir)">Otro (escribir)</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={newMatch.team1Player1.value}
                                            onChange={(e) => handleCustomPlayerInputChange(e, 'team1Player1')}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                            placeholder="Nombre del jugador"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 1 - Jugador 2:</label>
                                    {newMatch.team1Player2.type === 'dropdown' ? (
                                        <select
                                            value={newMatch.team1Player2.value}
                                            onChange={(e) => handlePlayerDropdownChange(e, 'team1Player2')}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                        >
                                            <option value="">Selecciona un jugador</option>
                                            {playerList.map((player, index) => (
                                                <option key={index} value={player}>{player}</option>
                                            ))}
                                            <option value="Otro (escribir)">Otro (escribir)</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={newMatch.team1Player2.value}
                                            onChange={(e) => handleCustomPlayerInputChange(e, 'team1Player2')}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                            placeholder="Nombre del jugador"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 2 - Jugador 1:</label>
                                    {newMatch.team2Player1.type === 'dropdown' ? (
                                        <select
                                            value={newMatch.team2Player1.value}
                                            onChange={(e) => handlePlayerDropdownChange(e, 'team2Player1')}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                        >
                                            <option value="">Selecciona un jugador</option>
                                            {playerList.map((player, index) => (
                                                <option key={index} value={player}>{player}</option>
                                            ))}
                                            <option value="Otro (escribir)">Otro (escribir)</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={newMatch.team2Player1.value}
                                            onChange={(e) => handleCustomPlayerInputChange(e, 'team2Player1')}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                            placeholder="Nombre del jugador"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Equipo 2 - Jugador 2:</label>
                                    {newMatch.team2Player2.type === 'dropdown' ? (
                                        <select
                                            value={newMatch.team2Player2.value}
                                            onChange={(e) => handlePlayerDropdownChange(e, 'team2Player2')}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                        >
                                            <option value="">Selecciona un jugador</option>
                                            {playerList.map((player, index) => (
                                                <option key={index} value={player}>{player}</option>
                                            ))}
                                            <option value="Otro (escribir)">Otro (escribir)</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={newMatch.team2Player2.value}
                                            onChange={(e) => handleCustomPlayerInputChange(e, 'team2Player2')}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                                            placeholder="Nombre del jugador"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Puntaje Equipo 1:</label>
                                    <input
                                        type="number"
                                        name="scoreTeam1"
                                        value={newMatch.scoreTeam1}
                                        onChange={handleNewMatchOtherInputChange}
                                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
                                        placeholder="Puntaje"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Puntaje Equipo 2:</label>
                                    <input
                                        type="number"
                                        name="scoreTeam2"
                                        value={newMatch.scoreTeam2}
                                        onChange={handleNewMatchOtherInputChange}
                                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
                                        placeholder="Puntaje"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Fecha:</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={newMatch.date}
                                        onChange={handleNewMatchOtherInputChange}
                                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-lg font-bold mb-3">Comentario:</label>
                                    <input
                                        type="text"
                                        name="comment"
                                        value={newMatch.comment}
                                        onChange={handleNewMatchOtherInputChange}
                                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
                                        placeholder="Comentario opcional"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => addMatch()}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full mt-6 transform transition-transform duration-200 hover:scale-105 text-xl"
                            >
                                <PlusCircle className="mr-3" size={24} /> Agregar Partido
                            </button>
                        </div>
                    )}
                    {selectedDate && groupedMatches[selectedDate] && (
                        <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
                            <h2 className="text-2xl font-semibold text-blue-700 mb-4">Partidos del {selectedDate}</h2>
                            {groupedMatches[selectedDate].matches.length === 0 ? (
                                <p className="text-gray-500">No hay partidos registrados para esta fecha.</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-3">
                                        {groupedMatches[selectedDate].matches.map((match, index) => (
                                            <div key={match.id} className={`bg-gray-50 p-3 rounded-lg shadow-sm border ${match.isDeleted ? 'border-red-300 bg-red-50' : 'border-gray-100'} ${match.pendingConfirmation && !match.isDeleted ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                                                <p className="text-md font-semibold text-blue-800 mb-1">
                                                    #{index + 1} - {(match.team1Players || []).join(' y ') || 'N/A'} vs {(match.team2Players || []).join(' y ') || 'N/A'}
                                                </p>
                                                <p className="text-lg font-bold text-blue-600 mb-1">
                                                    Resultado: {match.scoreTeam1 !== '' && match.scoreTeam2 !== '' ? `${match.scoreTeam1} - ${match.scoreTeam2}` : 'Puntuación no registrada'}
                                                </p>
                                                <p className="text-sm text-green-700 font-semibold mb-2">
                                                    Ganador: {match.winner || 'No determinado'}
                                                </p>
                                                {match.comment && (
                                                    <p className="text-sm text-gray-600 mb-2">Comentario: {match.comment}</p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Cargado por: <span className="font-semibold">{match.loadedBy || 'Desconocido'}</span> el <span className="font-semibold">{match.timestamp ? new Date(match.timestamp.toDate()).toLocaleString() : 'N/A'}</span>
                                                </p>
                                                {match.isDeleted && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        Eliminado por: <span className="font-semibold">{match.deletedBy || 'Desconocido'}</span> el <span className="font-semibold">{match.deletedTimestamp ? new Date(match.deletedTimestamp.toDate()).toLocaleString() : 'N/A'}</span>
                                                    </p>
                                                )}
                                                {match.pendingConfirmation && !match.isDeleted && (
                                                    <p className="text-xs text-yellow-600 font-semibold mt-1">Pendiente de confirmación por un administrador</p>
                                                )}
                                                {match.editHistory && match.editHistory.length > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Historial de Ediciones:
                                                        <ul className="list-disc list-inside ml-2">
                                                            {match.editHistory.map((edit, idx) => (
                                                                <li key={idx}>
                                                                    <span className="font-semibold">{edit.editedBy}</span> el <span className="font-semibold">{edit.editedTimestamp ? new Date(edit.editedTimestamp.toDate()).toLocaleString() : 'N/A'}</span>: {edit.changes.join(', ')}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {!match.isDeleted && (
                                                    <div className="flex space-x-2 mt-2">
                                                        <button
                                                            onClick={() => startEditing(match)}
                                                            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded-full focus:outline-none focus:shadow-outline flex items-center text-sm"
                                                        >
                                                            <Edit className="mr-1" size={16} /> Editar
                                                        </button>
                                                        <button
                                                            onClick={() => confirmDeleteMatch(match)}
                                                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-full focus:outline-none focus:shadow-outline flex items-center text-sm"
                                                        >
                                                            <Trash2 className="mr-1" size={16} /> Eliminar
                                                        </button>
                                                        {match.pendingConfirmation && welcomePlayerList.includes(loadedByPlayer) && (
                                                            <button
                                                                onClick={() => confirmMatch(match.id)}
                                                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-full focus:outline-none focus:shadow-outline flex items-center text-sm"
                                                            >
                                                                <CheckCircle className="mr-1" size={16} /> Confirmar
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <h3 className="text-xl font-semibold text-blue-700 mt-6 mb-4">Resumen de Jugadores</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {Object.entries(groupedMatches[selectedDate].summary)
                                            .sort(([a], [b]) => a.localeCompare(b))
                                            .map(([player, stats]) => (
                                                <div key={player} className="bg-blue-50 p-3 rounded-lg shadow-sm border border-blue-200">
                                                    <p className="text-md font-semibold text-blue-800 mb-1">{player}</p>
                                                    <p className="text-sm text-gray-600">Jugados: {stats.played}</p>
                                                    <p className="text-sm text-gray-600">Ganados: {stats.won}</p>
                                                    <p className="text-sm text-gray-600">Perdidos: {stats.lost}</p>
                                                    <div className="flex items-center mt-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={stats.paid}
                                                            onChange={(e) => handlePaidChange(selectedDate, player, e.target.checked)}
                                                            className="mr-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                            disabled={!welcomePlayerList.includes(loadedByPlayer)}
                                                        />
                                                        <label className="text-sm text-gray-600">¿Pagó?</label>
                                                    </div>
                                                    {stats.paymentHistory && stats.paymentHistory.length > 0 && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Historial de Pagos:
                                                            <ul className="list-disc list-inside ml-2">
                                                                {stats.paymentHistory.map((entry, idx) => (
                                                                    <li key={idx}>
                                                                        <span className="font-semibold">{entry.changedBy}</span> el <span className="font-semibold">{entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleString() : 'N/A'}</span>: {entry.action}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <button
                        onClick={downloadMatchHistory}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full max-w-xs mx-auto transform transition-transform duration-200 hover:scale-105 text-xl mb-6"
                    >
                        <Download className="mr-3" size={24} /> Descargar Historial
                    </button>
                    <button
                        onClick={handleShowStats}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full max-w-xs mx-auto transform transition-transform duration-200 hover:scale-105 text-xl mb-6"
                    >
                        <BarChart2 className="mr-3" size={24} /> Ver Estadísticas
                    </button>
                    <button
                        onClick={handleExitApp}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full max-w-xs mx-auto transform transition-transform duration-200 hover:scale-105 text-xl"
                    >
                        <LogOut className="mr-3" size={24} /> Salir
                    </button>
                </div>
                <CopyrightFooter />
            </div>
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-red-700 mb-4">Confirmar Eliminación</h3>
                        <p className="text-gray-700 mb-4">¿Estás seguro de que deseas eliminar este partido? Esta acción no se puede deshacer.</p>
                        {matchToDelete && (
                            <p className="text-sm text-gray-600 mb-4">
                                <strong>Partido:</strong> {(matchToDelete.team1Players || []).join(' y ') || 'N/A'} vs {(matchToDelete.team2Players || []).join(' y ') || 'N/A'} ({matchToDelete.scoreTeam1 || 'N/A'} - {matchToDelete.scoreTeam2 || 'N/A'})
                            </p>
                        )}
                        <div className="flex space-x-4">
                            <button
                                onClick={deleteMatch}
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105"
                            >
                                <Trash2 className="mr-2" size={18} /> Eliminar
                            </button>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105"
                            >
                                <XCircle className="mr-2" size={18} /> Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ErrorBoundary>
    );
}

export default App;