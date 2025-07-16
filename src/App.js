import React, { useState, useEffect, Component } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot,  
    doc, 
    deleteDoc, 
    updateDoc,
    setDoc,
    Timestamp
} from 'firebase/firestore';
import { PlusCircle, Trash2, Edit, Save, XCircle, Download, LogIn, LogOut, BarChart2 } from 'lucide-react';
import Calendar from 'react-calendar'; // Import react-calendar
import './styles/Calendar.css'; // Import default styles

// Firebase configuration and initialization
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global variables for Canvas environment
const appId = process.env.REACT_APP_APP_ID || 'default-app-id';

// Predefined list of players for match entry, sorted alphabetically
const playerList = [
    "Ale Perrone", "Alexis", "Ariel", "Bruno", "Condor", "Coreano", "Daniel", "Diego Balazo", "Elvis", 
    "Ezequiel", "Facundo", "Federico", "Fito", "Franco", "Gaby Mecanico", "German", "Guillermo", "Hector Musico", 
    "Hugo", "Ivan", "Javier", "Joni", "Julian Olivieri", "Julian Rugna", "Lautaro", "Leandro", "Lucy", "Luigi", 
    "Luis", "Marcelo", "Marcelo Zurdo", "Mariano", "Mario Arriola", "Martin", "Matias", "Maxi", "Mono", "Nacho", 
    "Nico Ciudad", "Raul", "Roberto", "Rodrigo", "Ruben", "Sergio", "Sosa", "Tano", "Tito", "Vasco", 
    "Zurdo Diaz", "Zurdo Ruben"
].sort();

// Predefined list of players for the welcome screen dropdown, sorted alphabetically
const welcomePlayerList = [
    "Ariel", "Bruno", "Ezequiel", "Mono", "Otro", "Ruben", "Zurdo Diaz"
].sort();

// Hardcoded PINs for demonstration (HIGHLY INSECURE IN REAL APPLICATIONS)
const playerPins = {
    "Bruno": "1234",
    "Ruben": "5678",
    "Zurdo Diaz": "9012",
    "Ezequiel": "3456",
    "Ariel": "7890",
    "Mono": "2345",
    "Otro": "1111",
};

// Helper function to check if a player name is in the predefined list
const isPredefinedPlayer = (playerName) => playerName && playerList.includes(playerName);

// ErrorBoundary component to catch rendering errors
class ErrorBoundary extends Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline"> Ocurrio un error al renderizar la pagina. Por favor, recarga la pagina o contacta al administrador.</span>
                    <p className="text-sm mt-2">Detalles: {this.state.error?.message}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    const [matches, setMatches] = useState([]);
    const [deletedMatches, setDeletedMatches] = useState([]); // New state for deleted matches
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
    const [groupedMatches, setGroupedMatches] = useState({}); 
    const [selectedDate, setSelectedDate] = useState(null); // For calendar selection
    const [calendarDate, setCalendarDate] = useState(new Date()); // For calendar navigation
    const [showStats, setShowStats] = useState(false);
    const [statsPlayerFilter, setStatsPlayerFilter] = useState('');
    const [statsDateFrom, setStatsDateFrom] = useState('');
    const [statsDateTo, setStatsDateTo] = useState('');

    // New state for the welcome screen
    const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
    const [selectedWelcomePlayer, setSelectedWelcomePlayer] = useState('');
    const [customWelcomePlayerName, setCustomWelcomePlayerName] = useState('');
    const [welcomePin, setWelcomePin] = useState('');
    const [welcomeScreenError, setWelcomeScreenError] = useState('');
    const [loadedByPlayer, setLoadedByPlayer] = useState('');

    useEffect(() => {
        const setupFirebase = async () => {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Error during Firebase anonymous authentication:", error);
                setErrorMessage("Error al iniciar la sesion anonima de Firebase.");
            }
        };

        setupFirebase();

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
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
        const dailySummariesCollectionRef = collection(db, `artifacts/${appId}/dailySummaries`);

        const unsubscribeMatches = onSnapshot(matchesCollectionRef, (matchesSnapshot) => {
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
                isDeleted: false
            }));
            fetchedMatches.sort((a, b) => new Date(b.date) - new Date(a.date)); 
            setMatches(fetchedMatches);
            setErrorMessage(''); 
        }, (error) => {
            console.error("Error fetching matches:", error);
            setErrorMessage("Error al cargar los partidos. Por favor, intenta de nuevo.");
        });

        const unsubscribeDeletedMatches = onSnapshot(deletedMatchesCollectionRef, (deletedSnapshot) => {
            const fetchedDeletedMatches = deletedSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data().originalMatch,
                deletedBy: doc.data().deletedBy || 'Desconocido',
                deletedTimestamp: doc.data().deletedTimestamp || Timestamp.now(),
                isDeleted: true
            }));
            setDeletedMatches(fetchedDeletedMatches);
        }, (error) => {
            console.error("Error fetching deleted matches:", error);
            setErrorMessage("Error al cargar los partidos eliminados. Por favor, intenta de nuevo.");
        });

        const unsubscribeDailySummaries = onSnapshot(dailySummariesCollectionRef, (dailySummariesSnapshot) => {
            const fetchedDailySummaries = {};
            dailySummariesSnapshot.docs.forEach(doc => {
                fetchedDailySummaries[doc.id] = doc.data().players || {};
            });

            const grouped = {};
            const allMatches = [...matches, ...deletedMatches];
            allMatches.forEach(match => {
                const date = match.date || new Date().toISOString().split('T')[0];
                if (!grouped[date]) {
                    grouped[date] = {
                        matches: [],
                        summary: {}
                    };
                }
                grouped[date].matches.push(match);

                const allPlayersInMatch = [...(match.team1Players || []), ...(match.team2Players || [])];
                allPlayersInMatch.forEach(player => {
                    if (!player) return;
                    if (!grouped[date].summary[player]) {
                        grouped[date].summary[player] = { played: 0, won: 0, lost: 0, paid: false };
                    }
                    grouped[date].summary[player].played++;
                    if (fetchedDailySummaries[date] && fetchedDailySummaries[date][player]) {
                        grouped[date].summary[player].paid = fetchedDailySummaries[date][player].paid;
                    }
                });

                if (!match.isDeleted && match.winner && match.winner !== 'Empate' && match.winner !== 'N/A') {
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
            });
            setGroupedMatches(grouped);
        }, (error) => {
            console.error("Error fetching daily summaries:", error);
            setErrorMessage("Error al cargar los resumenes diarios.");
        });

        return () => {
            unsubscribeMatches();
            unsubscribeDeletedMatches();
            unsubscribeDailySummaries();
        };
    }, [matches, deletedMatches]);

    const handlePlayerDropdownChange = (e, playerKey, isEdit = false) => {
        const { value } = e.target;
        let currentMatchState = isEdit ? editedMatch : newMatch;
        let setMatchState = isEdit ? setEditedMatch : setNewMatch;

        if (value === 'Otro (escribir)') {
            setMatchState({
                ...currentMatchState,
                [playerKey]: { value: '', type: 'custom' } 
            });
        } else {
            setMatchState({
                ...currentMatchState,
                [playerKey]: { value: value, type: 'dropdown' } 
            });
        }
    };

    const handleCustomPlayerInputChange = (e, playerKey, isEdit = false) => {
        const { value } = e.target;
        let currentMatchState = isEdit ? editedMatch : newMatch;
        let setMatchState = isEdit ? setEditedMatch : setNewMatch;

        setMatchState({
            ...currentMatchState,
            [playerKey]: { value: value, type: 'custom' } 
        });
    };

    const handleNewMatchOtherInputChange = (e) => {
        const { name, value } = e.target;
        setNewMatch({ ...newMatch, [name]: value });
    };

    const handleEditedMatchOtherInputChange = (e) => {
        const { name, value } = e.target;
        setEditedMatch({ ...editedMatch, [name]: value });
    };

    const handlePaidChange = async (date, player, isPaid) => {
        if (!userId) {
            setErrorMessage("La aplicacion no esta lista. Por favor, espera o recarga.");
            return;
        }

        try {
            const dailySummaryDocRef = doc(db, `artifacts/${appId}/dailySummaries`, date);
            await setDoc(dailySummaryDocRef, {
                players: {
                    [player]: { paid: isPaid }
                }
            }, { merge: true });
            setErrorMessage('');
        } catch (e) {
            console.error("Error updating paid status:", e);
            setErrorMessage("Error al actualizar el estado de pago. Intenta de nuevo.");
        }
    };

    const addMatch = async () => {
        if (!userId) {
            setErrorMessage("La aplicacion no esta lista. Por favor, espera o recarga.");
            return;
        }

        const team1Players = [newMatch.team1Player1.value, newMatch.team1Player2.value].filter(p => p);
        const team2Players = [newMatch.team2Player1.value, newMatch.team2Player2.value].filter(p => p);
        const { date, comment } = newMatch; 

        if (team1Players.length !== 2 || team2Players.length !== 2 || !date) {
            setErrorMessage("Por favor, completa todos los campos de jugadores y la fecha.");
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

        let score1 = newMatch.scoreTeam1;
        let score2 = newMatch.scoreTeam2;

        if (score1 !== '') {
            score1 = parseInt(score1);
            if (isNaN(score1) || score1 < 0) {
                setErrorMessage("La puntuacion del Equipo 1 debe ser un numero valido y no negativo.");
                return;
            }
        }
        if (score2 !== '') {
            score2 = parseInt(score2);
            if (isNaN(score2) || score2 < 0) {
                setErrorMessage("La puntuacion del Equipo 2 debe ser un numero valido y no negativo.");
                return;
            }
        }

        let winner = 'Empate';
        if (typeof score1 === 'number' && typeof score2 === 'number') {
            if (score1 > score2) {
                winner = `Equipo 1 (${team1Players.join(' y ')})`;
            } else if (score2 > score1) {
                winner = `Equipo 2 (${team2Players.join(' y ')})`;
            }
        } else {
            winner = 'N/A';
        }

        try {
            await addDoc(collection(db, `artifacts/${appId}/matches`), {
                team1Players, 
                team2Players, 
                scoreTeam1: score1, 
                scoreTeam2: score2, 
                date,
                comment,
                winner,
                loadedBy: loadedByPlayer,
                timestamp: Timestamp.now(),
                editHistory: [],
                isDeleted: false
            });
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
            setErrorMessage('');
        } catch (e) {
            console.error("Error adding document: ", e);
            setErrorMessage("Error al guardar el partido. Intenta de nuevo.");
        }
    };

    const confirmDeleteMatch = (match) => {
        setMatchToDelete(match);
        setShowConfirmModal(true);
    };

    const deleteMatch = async () => {
        if (!userId || !matchToDelete) return;
        try {
            await addDoc(collection(db, `artifacts/${appId}/deletedMatches`), {
                originalMatch: {
                    ...matchToDelete,
                    isDeleted: true
                },
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

    const startEditing = (match) => {
        if (!userId) {
            setErrorMessage("La aplicacion no esta lista. Por favor, espera o recarga.");
            return;
        }
        
        const transformedEditedMatch = {
            ...match,
            team1Player1: { value: match.team1Players[0] || '', type: isPredefinedPlayer(match.team1Players[0]) ? 'dropdown' : 'custom' },
            team1Player2: { value: match.team1Players[1] || '', type: isPredefinedPlayer(match.team1Players[1]) ? 'dropdown' : 'custom' },
            team2Player1: { value: match.team2Players[0] || '', type: isPredefinedPlayer(match.team2Players[0]) ? 'dropdown' : 'custom' },
            team2Player2: { value: match.team2Players[1] || '', type: isPredefinedPlayer(match.team2Players[1]) ? 'dropdown' : 'custom' },
            comment: match.comment || '',
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

        if (score1 !== '') {
            score1 = parseInt(score1);
            if (isNaN(score1) || score1 < 0) {
                setErrorMessage("La puntuacion del Equipo 1 debe ser un numero valido y no negativo.");
                return;
            }
        }
        if (score2 !== '') {
            score2 = parseInt(score2);
            if (isNaN(score2) || score2 < 0) {
                setErrorMessage("La puntuacion del Equipo 2 debe ser un numero valido y no negativo.");
                return;
            }
        }

        let winner = 'Empate';
        if (typeof score1 === 'number' && typeof score2 === 'number') {
            if (score1 > score2) {
                winner = `Equipo 1 (${team1Players.join(' y ')})`;
            } else if (score2 > score1) {
                winner = `Equipo 2 (${team2Players.join(' y ')})`;
            }
        } else {
            winner = 'N/A';
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
                changes.push(`Puntuacion Equipo 1 cambiada de ${originalMatch.scoreTeam1 || 'N/A'} a ${score1 || 'N/A'}`);
            }
            if (originalMatch.scoreTeam2 !== score2) {
                changes.push(`Puntuacion Equipo 2 cambiada de ${originalMatch.scoreTeam2 || 'N/A'} a ${score2 || 'N/A'}`);
            }
            if (originalMatch.date !== date) {
                changes.push(`Fecha cambiada de ${originalMatch.date} a ${date}`);
            }
            if (originalMatch.comment !== comment) {
                changes.push(`Comentario cambiado de "${originalMatch.comment || 'N/A'}" a "${comment || 'N/A'}"`);
            }
        }

        try {
            const newEditEntry = {
                editedBy: loadedByPlayer,
                editedTimestamp: Timestamp.now(),
                changes: changes.length > 0 ? changes : ['Edicion menor']
            };

            await updateDoc(doc(db, `artifacts/${appId}/matches`, editedMatch.id), {
                team1Players, 
                team2Players, 
                scoreTeam1: score1, 
                scoreTeam2: score2, 
                date,
                comment,
                winner,
                editHistory: [...(editedMatch.editHistory || []), newEditEntry],
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

        const headers = [
            "Numero",
            "Fecha",
            "Equipo 1 - Jugador 1",
            "Equipo 1 - Jugador 1 Pago?",
            "Equipo 1 - Jugador 2",
            "Equipo 1 - Jugador 2 Pago?",
            "Equipo 2 - Jugador 1",
            "Equipo 2 - Jugador 1 Pago?",
            "Equipo 2 - Jugador 2",
            "Equipo 2 - Jugador 2 Pago?",
            "Equipo 1 Puntuacion",
            "Equipo 2 Puntuacion",
            "Equipo 1 - Gano?",
            "Equipo 2 - Gano?",
            "Comentario",
            "Cargado por",
            "Estado",
            "Eliminado por",
            "Fecha de Eliminacion",
            "Historial de Ediciones"
        ];

        const allMatches = [...matches, ...deletedMatches];
        const rows = allMatches.map((match, index) => {
            const team1Player1Paid = groupedMatches[match.date]?.summary[match.team1Players[0]]?.paid ? 'Si' : 'No';
            const team1Player2Paid = groupedMatches[match.date]?.summary[match.team1Players[1]]?.paid ? 'Si' : 'No';
            const team2Player1Paid = groupedMatches[match.date]?.summary[match.team2Players[0]]?.paid ? 'Si' : 'No';
            const team2Player2Paid = groupedMatches[match.date]?.summary[match.team2Players[1]]?.paid ? 'Si' : 'No';

            const score1 = match.scoreTeam1 !== '' ? match.scoreTeam1 : 'N/A';
            const score2 = match.scoreTeam2 !== '' ? match.scoreTeam2 : 'N/A';

            const team1Won = match.winner && match.winner.startsWith('Equipo 1') ? 'Si' : 'No';
            const team2Won = match.winner && match.winner.startsWith('Equipo 2') ? 'Si' : 'No';
            
            const loadedBy = match.loadedBy || 'Desconocido';
            const comment = match.comment || '';
            const status = match.isDeleted ? 'Dado de Baja' : 'Activo';
            const deletedBy = match.isDeleted ? match.deletedBy || 'Desconocido' : '';
            const deletedTimestamp = match.isDeleted && match.deletedTimestamp ? new Date(match.deletedTimestamp.toDate()).toLocaleString() : '';
            
            const editHistoryString = (match.editHistory || [])
                .map(edit => `${edit.editedBy} (${new Date(edit.editedTimestamp.toDate()).toLocaleString()}): ${edit.changes.join(', ')}`)
                .join('; ');

            return [
                index + 1,
                match.date,
                match.team1Players[0] || 'N/A',
                team1Player1Paid,
                match.team1Players[1] || 'N/A',
                team1Player2Paid,
                match.team2Players[0] || 'N/A',
                team2Player1Paid,
                match.team2Players[1] || 'N/A',
                team2Player2Paid,
                score1,
                score2,
                team1Won,
                team2Won,
                comment,
                loadedBy,
                status,
                deletedBy,
                deletedTimestamp,
                editHistoryString
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

        let playerToLoad = selectedWelcomePlayer;

        if (selectedWelcomePlayer === '') {
            setWelcomeScreenError('Por favor, selecciona un jugador para ingresar.');
            return;
        }

        if (selectedWelcomePlayer === 'Otro') {
            if (customWelcomePlayerName.trim() === '') {
                setWelcomeScreenError('Por favor, ingresa un nombre para el jugador "Otro".');
                return;
            }
            playerToLoad = customWelcomePlayerName.trim();
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

        setLoadedByPlayer(playerToLoad);
        setShowWelcomeScreen(false);
        setShowStats(false);
        setWelcomePin('');
        setCustomWelcomePlayerName('');
    };

    const handleExitApp = () => {
        setShowWelcomeScreen(true);
        setSelectedWelcomePlayer('');
        setWelcomePin('');
        setLoadedByPlayer('');
        setErrorMessage('');
        setWelcomeScreenError('');
        setCustomWelcomePlayerName('');
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
    };

    const handleShowStats = () => {
        setShowStats(true);
        setShowWelcomeScreen(false);
    };

    const filteredMatches = matches.filter(match => {
        if (!match || !match.date || !match.team1Players || !match.team2Players) return false;

        let matchesPlayer = !statsPlayerFilter || 
            (match.team1Players.includes(statsPlayerFilter) || 
             match.team2Players.includes(statsPlayerFilter));

        let matchesDate = true;
        if (statsDateFrom && statsDateTo) {
            matchesDate = match.date >= statsDateFrom && match.date <= statsDateTo;
        } else if (statsDateFrom) {
            matchesDate = match.date >= statsDateFrom;
        } else if (statsDateTo) {
            matchesDate = match.date <= statsDateTo;
        }

        return matchesPlayer && matchesDate;
    });

    const statsSummary = {};
    if (statsPlayerFilter) {
        statsSummary[statsPlayerFilter] = { played: 0, won: 0, lost: 0 };
        filteredMatches.forEach(match => {
            if (!match || !match.team1Players || !match.team2Players) return;
            if (match.team1Players.includes(statsPlayerFilter) || match.team2Players.includes(statsPlayerFilter)) {
                statsSummary[statsPlayerFilter].played++;
                if (match.winner && match.winner !== 'Empate' && match.winner !== 'N/A') {
                    if (match.winner.startsWith('Equipo 1')) {
                        if (match.team1Players.includes(statsPlayerFilter)) {
                            statsSummary[statsPlayerFilter].won++;
                        } else if (match.team2Players.includes(statsPlayerFilter)) {
                            statsSummary[statsPlayerFilter].lost++;
                        }
                    } else if (match.winner.startsWith('Equipo 2')) {
                        if (match.team2Players.includes(statsPlayerFilter)) {
                            statsSummary[statsPlayerFilter].won++;
                        } else if (match.team1Players.includes(statsPlayerFilter)) {
                            statsSummary[statsPlayerFilter].lost++;
                        }
                    }
                }
            }
        });
    }

    const tileContent = ({ date, view }) => {
        if (view !== 'month') return null;
        const dateStr = date.toISOString().split('T')[0];
        const matchCount = groupedMatches[dateStr]?.matches.length || 0;
        return matchCount > 0 ? (
            <p className="text-xs text-blue-600 font-bold">{matchCount} partido{matchCount > 1 ? 's' : ''}</p>
        ) : null;
    };

    const handleCalendarChange = (date) => {
        setCalendarDate(date);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-600 text-white font-inter">
                <p>Cargando aplicacion...</p>
            </div>
        );
    }

    if (showStats) {
        return (
            <ErrorBoundary>
                <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 p-4 font-inter text-gray-800 flex flex-col items-center">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl mb-8">
                        <h1 className="text-4xl font-bold text-center text-purple-700 mb-6">Estadisticas de Partidos</h1>
                        <div className="flex justify-between mb-4">
                            <button
                                onClick={handleExitApp}
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                            >
                                <LogOut className="mr-2" size={20} /> Volver
                            </button>
                        </div>

                        {matches.length === 0 ? (
                            <p className="text-center text-gray-500">Cargando datos de partidos...</p>
                        ) : (
                            <>
                                <div className="mb-8 p-4 border border-blue-200 rounded-lg bg-blue-50">
                                    <h2 className="text-2xl font-semibold text-blue-700 mb-4">Filtros</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Jugador:</label>
                                            <select
                                                value={statsPlayerFilter}
                                                onChange={(e) => setStatsPlayerFilter(e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            >
                                                <option value="">Todos los jugadores</option>
                                                {playerList.map((player, index) => (
                                                    <option key={index} value={player}>
                                                        {player}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Fecha Desde:</label>
                                            <input
                                                type="date"
                                                value={statsDateFrom}
                                                onChange={(e) => setStatsDateFrom(e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Fecha Hasta:</label>
                                            <input
                                                type="date"
                                                value={statsDateTo}
                                                onChange={(e) => setStatsDateTo(e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <h2 className="text-2xl font-semibold text-purple-700 mb-4">Resumen de Estadisticas</h2>
                                {statsPlayerFilter && Object.keys(statsSummary).length > 0 ? (
                                    <div className="bg-blue-100 p-3 rounded-lg shadow-sm border border-blue-200 mb-6">
                                        <p className="font-bold text-blue-800">{statsPlayerFilter}</p>
                                        <p className="text-gray-700">Jugados: {statsSummary[statsPlayerFilter].played}</p>
                                        <p className="text-green-700">Ganados: {statsSummary[statsPlayerFilter].won}</p>
                                        <p className="text-red-700">Perdidos: {statsSummary[statsPlayerFilter].lost}</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500">Selecciona un jugador para ver su resumen.</p>
                                )}

                                <h2 className="text-2xl font-semibold text-purple-700 mb-4">Lista de Partidos</h2>
                                {filteredMatches.length === 0 ? (
                                    <p className="text-gray-500">No hay partidos para los filtros seleccionados.</p>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {filteredMatches.map((match, index) => (
                                            <div key={match.id} className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-100">
                                                <p className="text-md font-semibold text-blue-800 mb-1">
                                                    #{index + 1} - {match.date}: {(match.team1Players || []).join(' y ') || 'N/A'} vs {(match.team2Players || []).join(' y ') || 'N/A'}
                                                </p>
                                                <p className="text-lg font-bold text-purple-600 mb-1">
                                                    Resultado: {match.scoreTeam1 !== '' && match.scoreTeam2 !== '' ? `${match.scoreTeam1} - ${match.scoreTeam2}` : 'Puntuacion no registrada'}
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
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </ErrorBoundary>
        );
    }

    if (showWelcomeScreen) {
        return (
            <ErrorBoundary>
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-600 p-4 font-inter text-gray-800">
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
                        <h1 className="text-4xl font-bold text-purple-700 mb-4">Defensores de Santos Lugares - Pelota Paleta</h1>
                        <h2 className="text-2xl font-semibold text-blue-700 mb-8">Registro Diario</h2>
                        
                        {welcomeScreenError && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                                <strong className="font-bold">Error:</strong>
                                <span className="block sm:inline"> {welcomeScreenError}</span>
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-gray-700 text-lg font-bold mb-3" htmlFor="welcome-player-select">
                                Quien Ingresa?
                            </label>
                            <select
                                id="welcome-player-select"
                                value={selectedWelcomePlayer}
                                onChange={(e) => {
                                    setSelectedWelcomePlayer(e.target.value);
                                    setWelcomePin('');
                                    setCustomWelcomePlayerName('');
                                }}
                                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                            >
                                <option value="">Seleccionar Jugador</option>
                                {welcomePlayerList.map((player, index) => (
                                    <option key={index} value={player}>
                                        {player}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedWelcomePlayer === 'Otro' && (
                            <div className="mb-6">
                                <label className="block text-gray-700 text-lg font-bold mb-3" htmlFor="custom-player-name-input">
                                    Nombre del Jugador:
                                </label>
                                <input
                                    type="text"
                                    id="custom-player-name-input"
                                    value={customWelcomePlayerName}
                                    onChange={(e) => setCustomWelcomePlayerName(e.target.value)}
                                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center"
                                    placeholder="Escribe el nombre"
                                />
                            </div>
                        )}
                        {selectedWelcomePlayer && (
                            <div className="mb-6">
                                <label className="block text-gray-700 text-lg font-bold mb-3" htmlFor="welcome-pin-input">
                                    Ingresa tu PIN (4 digitos):
                                </label>
                                <input
                                    type="password"
                                    id="welcome-pin-input"
                                    value={welcomePin}
                                    onChange={(e) => setWelcomePin(e.target.value)}
                                    maxLength="4"
                                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center tracking-widest"
                                    placeholder="****"
                                />
                                {selectedWelcomePlayer === 'Otro' && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Si selecciona "Otro" ingresa el codigo 1111
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="flex flex-col space-y-4">
                            <button
                                onClick={handleWelcomeEnter}
                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                            >
                                <LogIn className="mr-3" size={24} /> Ingresar
                            </button>
                            <button
                                onClick={handleShowStats}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                            >
                                <BarChart2 className="mr-3" size={24} /> Ver Estadisticas
                            </button>
                        </div>
                    </div>
                </div>
            </ErrorBoundary>
        );
    }

    const renderPlayerInput = (playerState, setPlayerState, playerKey, isEdit = false) => (
        <>
            <select
                value={playerState.type === 'custom' ? 'Otro (escribir)' : playerState.value}
                onChange={(e) => handlePlayerDropdownChange(e, playerKey, isEdit)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
            >
                <option value="">Seleccionar Jugador</option>
                {playerList.map((player, index) => (
                    <option key={index} value={player}>
                        {player}
                    </option>
                ))}
                <option value="Otro (escribir)">Otro (escribir)</option>
            </select>
            {playerState.type === 'custom' && (
                <input
                    type="text"
                    value={playerState.value}
                    onChange={(e) => handleCustomPlayerInputChange(e, playerKey, isEdit)}
                    placeholder="Escribe el nombre del jugador"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-2"
                />
            )}
        </>
    );

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 p-4 font-inter text-gray-800 flex flex-col items-center">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl mb-8">
                    <h1 className="text-4xl font-bold text-center text-purple-700 mb-6">Control de Partidos de Pelota Paleta</h1>
                    {userId && (
                        <p className="text-sm text-center text-gray-500 mb-4">
                            ID de Usuario (Anonimo): <span className="font-mono bg-gray-100 p-1 rounded">{userId}</span>
                        </p>
                    )}
                    {loadedByPlayer && (
                        <p className="text-sm text-center text-gray-500 mb-4">
                            Ingresado como: <span className="font-mono bg-gray-100 p-1 rounded">{loadedByPlayer}</span>
                        </p>
                    )}

                    {errorMessage && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <strong className="font-bold">Error:</strong>
                            <span className="block sm:inline"> {errorMessage}</span>
                        </div>
                    )}

                    <div className="flex justify-end mb-4">
                        <button
                            onClick={handleExitApp}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                        >
                            <LogOut className="mr-2" size={20} /> Salir
                        </button>
                    </div>

                    <div className="mb-8 p-4 border border-blue-200 rounded-lg bg-blue-50">
                        <h2 className="text-2xl font-semibold text-blue-700 mb-4">Registrar Nuevo Partido</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Equipo 1:</label>
                                {renderPlayerInput(newMatch.team1Player1, setNewMatch, 'team1Player1')}
                                {renderPlayerInput(newMatch.team1Player2, setNewMatch, 'team1Player2')}
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Equipo 2:</label>
                                {renderPlayerInput(newMatch.team2Player1, setNewMatch, 'team2Player1')}
                                {renderPlayerInput(newMatch.team2Player2, setNewMatch, 'team2Player2')}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Puntuacion Equipo 1 (Opcional):</label>
                                <input
                                    type="number"
                                    name="scoreTeam1"
                                    value={newMatch.scoreTeam1}
                                    onChange={handleNewMatchOtherInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Puntuacion Equipo 2 (Opcional):</label>
                                <input
                                    type="number"
                                    name="scoreTeam2"
                                    value={newMatch.scoreTeam2}
                                    onChange={handleNewMatchOtherInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Fecha:</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={newMatch.date}
                                    onChange={handleNewMatchOtherInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Comentario (Opcional):</label>
                            <textarea
                                name="comment"
                                value={newMatch.comment}
                                onChange={handleNewMatchOtherInputChange}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Escribe un comentario sobre el partido"
                            />
                        </div>
                        <button
                            onClick={addMatch}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105"
                        >
                            <PlusCircle className="mr-2" size={20} /> Agregar Partido
                        </button>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-purple-700">Resumen de Partidos por Fecha</h2>
                        <button
                            onClick={downloadMatchHistory}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                        >
                            <Download className="mr-2" size={20} /> Descargar Historial
                        </button>
                    </div>

                    <div className="mb-8">
                        <Calendar
                            onChange={handleCalendarChange}
                            value={calendarDate}
                            tileContent={tileContent}
                            className="w-full border border-gray-200 rounded-lg shadow-sm bg-white p-4"
                        />
                    </div>

                    {selectedDate && groupedMatches[selectedDate] ? (
                        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl mb-8 border border-purple-200">
                            <h3 className="text-3xl font-bold text-purple-800 mb-4">Fecha: {selectedDate} ({groupedMatches[selectedDate].matches.length} partidos)</h3>
                            <h4 className="text-xl font-semibold text-blue-700 mb-3">Partidos del Dia:</h4>
                            <div className="grid grid-cols-1 gap-3 mb-6">
                                {groupedMatches[selectedDate].matches.map((match) => (
                                    <div
                                        key={match.id}
                                        className={`p-3 rounded-lg shadow-sm border ${match.isDeleted ? 'bg-gray-200 border-red-300 text-red-700' : 'bg-gray-50 border-gray-100'}`}
                                    >
                                        {editingMatchId === match.id ? (
                                            <div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">Equipo 1:</label>
                                                        {renderPlayerInput(editedMatch.team1Player1, setEditedMatch, 'team1Player1', true)}
                                                        {renderPlayerInput(editedMatch.team1Player2, setEditedMatch, 'team1Player2', true)}
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">Equipo 2:</label>
                                                        {renderPlayerInput(editedMatch.team2Player1, setEditedMatch, 'team2Player1', true)}
                                                        {renderPlayerInput(editedMatch.team2Player2, setEditedMatch, 'team2Player2', true)}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">Puntuacion Eq. 1 (Opcional):</label>
                                                        <input
                                                            type="number"
                                                            name="scoreTeam1"
                                                            value={editedMatch.scoreTeam1}
                                                            onChange={handleEditedMatchOtherInputChange}
                                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">Puntuacion Eq. 2 (Opcional):</label>
                                                        <input
                                                            type="number"
                                                            name="scoreTeam2"
                                                            value={editedMatch.scoreTeam2}
                                                            onChange={handleEditedMatchOtherInputChange}
                                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">Fecha:</label>
                                                        <input
                                                            type="date"
                                                            name="date"
                                                            value={editedMatch.date}
                                                            onChange={handleEditedMatchOtherInputChange}
                                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2">Comentario (Opcional):</label>
                                                    <textarea
                                                        name="comment"
                                                        value={editedMatch.comment}
                                                        onChange={handleEditedMatchOtherInputChange}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        placeholder="Escribe un comentario sobre el partido"
                                                    />
                                                </div>
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={saveEditedMatch}
                                                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-full focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                                                    >
                                                        <Save className="mr-1" size={18} /> Guardar
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-full focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                                                    >
                                                        <XCircle className="mr-1" size={18} /> Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-md font-semibold mb-1">
                                                    {(match.team1Players || []).join(' y ') || 'N/A'} vs {(match.team2Players || []).join(' y ') || 'N/A'}
                                                    {match.isDeleted && (
                                                        <span className="ml-2 font-bold text-red-700">Dado de Baja</span>
                                                    )}
                                                </p>
                                                <p className="text-lg font-bold text-purple-600 mb-1">
                                                    Resultado: {match.scoreTeam1 !== '' && match.scoreTeam2 !== '' ? `${match.scoreTeam1} - ${match.scoreTeam2}` : 'Puntuacion no registrada'}
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
                                                        Eliminado por: <span className="font-semibold">{match.deletedBy}</span> el <span className="font-semibold">{match.deletedTimestamp ? new Date(match.deletedTimestamp.toDate()).toLocaleString() : 'N/A'}</span>
                                                    </p>
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
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => startEditing(match)}
                                                            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded-full text-sm focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                                                        >
                                                            <Edit className="mr-1" size={16} /> Editar
                                                        </button>
                                                        <button
                                                            onClick={() => confirmDeleteMatch(match)}
                                                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-full text-sm focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                                                        >
                                                            <Trash2 className="mr-1" size={16} /> Eliminar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <h4 className="text-xl font-semibold text-blue-700 mb-3">Resumen de Jugadores:</h4>
                            {Object.keys(groupedMatches[selectedDate].summary).length === 0 ? (
                                <p className="text-gray-500">No hay datos de resumen para esta fecha.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(groupedMatches[selectedDate].summary).map(([player, stats]) => (
                                        <div key={player} className="bg-blue-100 p-3 rounded-lg shadow-sm border border-blue-200 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-blue-800">{player}</p>
                                                <p className="text-gray-700">Jugados: {stats.played}</p>
                                                <p className="text-green-700">Ganados: {stats.won}</p>
                                                <p className="text-red-700">Perdidos: {stats.lost}</p>
                                            </div>
                                            <div className="flex items-center">
                                                <label htmlFor={`paid-${selectedDate}-${player}`} className="mr-2 text-gray-700">Pago:</label>
                                                <input
                                                    type="checkbox"
                                                    id={`paid-${selectedDate}-${player}`}
                                                    checked={stats.paid || false}
                                                    onChange={(e) => handlePaidChange(selectedDate, player, e.target.checked)}
                                                    className="form-checkbox h-5 w-5 text-green-600 rounded focus:ring-green-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">Selecciona una fecha en el calendario para ver los partidos.</p>
                    )}
                </div>

                {showConfirmModal && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar Eliminacion</h3>
                            <p className="text-gray-600 mb-6">
                                Estas seguro de que quieres eliminar el partido del {matchToDelete?.date || 'N/A'} entre {(matchToDelete?.team1Players || []).join(' y ') || 'N/A'} vs {(matchToDelete?.team2Players || []).join(' y ') || 'N/A'}?
                            </p>
                            <div className="flex justify-center space-x-4">
                                <button
                                    onClick={deleteMatch}
                                    className="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transform transition-transform duration-200 hover:scale-105"
                                >
                                    Si, Eliminar
                                </button>
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transform transition-transform duration-200 hover:scale-105"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}

export default App;