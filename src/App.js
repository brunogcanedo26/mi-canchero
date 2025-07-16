import React, { useState, useEffect } from 'react';
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
import { PlusCircle, Trash2, Edit, Save, XCircle, ChevronDown, ChevronUp, Download, LogIn, LogOut } from 'lucide-react';

// Firebase configuration and initialization
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global variables for Canvas environment
const appId = process.env.REACT_APP_APP_ID || 'default-app-id';

// Predefined list of players for match entry
const playerList = [
    "Ale Perrone", "Alexis", "Ariel", "Bruno", "Condor", "Daniel", "Diego Balazo", "Elvis", "Ezequiel",
    "Facundo", "Federico", "Fito", "Franco", "Gaby Mecanico", "German", "Guillermo", "Hugo", "Ivan",
    "Javier", "Julian Rugna", "Julian Olivieri", "Lautaro", "Leandro", "Lucy", "Luigi", "Luis",
    "Marcelo Zurdo", "Marcelo", "Mariano", "Mario Arriola", "Martin", "Matias", "Maxi", "Mono",
    "Hector Musico", "Nacho", "Nico Ciudad", "Raul", "Sosa", "Roberto", "Rodrigo", "Coreano",
    "Ruben", "Sergio", "Tano", "Tito", "Vasco", "Joni", "Zurdo Diaz", "Zurdo Ruben"
];

// Predefined list of players for the welcome screen dropdown
const welcomePlayerList = [
    "Bruno", "Ruben", "Zurdo Diaz", "Ezequiel", "Ariel", "Mono", "Otro"
];

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
const isPredefinedPlayer = (playerName) => playerList.includes(playerName);

function App() {
    const [matches, setMatches] = useState([]);
    const [newMatch, setNewMatch] = useState({
        team1Player1: { value: '', type: 'dropdown' },
        team1Player2: { value: '', type: 'dropdown' },
        team2Player1: { value: '', type: 'dropdown' },
        team2Player2: { value: '', type: 'dropdown' },
        scoreTeam1: '',
        scoreTeam2: '',
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
    const [expandedDates, setExpandedDates] = useState(new Set()); 

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
        if (userId) { 
            const userMatchesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/matches`);
            const dailySummariesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/dailySummaries`);

            const unsubscribeMatches = onSnapshot(userMatchesCollectionRef, (matchesSnapshot) => {
                const fetchedMatches = matchesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                fetchedMatches.sort((a, b) => new Date(b.date) - new Date(a.date)); 
                setMatches(fetchedMatches);
                setErrorMessage(''); 

                const unsubscribeDailySummaries = onSnapshot(dailySummariesCollectionRef, (dailySummariesSnapshot) => {
                    const fetchedDailySummaries = {};
                    dailySummariesSnapshot.docs.forEach(doc => {
                        fetchedDailySummaries[doc.id] = doc.data().players || {};
                    });

                    const grouped = {};
                    fetchedMatches.forEach(match => {
                        const date = match.date; 
                        if (!grouped[date]) {
                            grouped[date] = {
                                matches: [],
                                summary: {}
                            };
                        }
                        grouped[date].matches.push(match);

                        const allPlayersInMatch = [...match.team1Players, ...match.team2Players];
                        allPlayersInMatch.forEach(player => {
                            if (!grouped[date].summary[player]) {
                                grouped[date].summary[player] = { played: 0, won: 0, lost: 0, paid: false };
                            }
                            grouped[date].summary[player].played++;
                            if (fetchedDailySummaries[date] && fetchedDailySummaries[date][player]) {
                                grouped[date].summary[player].paid = fetchedDailySummaries[date][player].paid;
                            }
                        });

                        if (match.winner && match.winner !== 'Empate' && match.winner !== 'N/A') {
                            if (match.winner.startsWith('Equipo 1')) {
                                match.team1Players.forEach(player => {
                                    grouped[date].summary[player].won++;
                                });
                                match.team2Players.forEach(player => {
                                    grouped[date].summary[player].lost++;
                                });
                            } else if (match.winner.startsWith('Equipo 2')) {
                                match.team2Players.forEach(player => {
                                    grouped[date].summary[player].won++;
                                });
                                match.team1Players.forEach(player => {
                                    grouped[date].summary[player].lost++;
                                });
                            }
                        }
                    });
                    setGroupedMatches(grouped);
                }, (error) => {
                    console.error("Error fetching daily summaries:", error);
                    setErrorMessage("Error al cargar los resumenes diarios.");
                });

                return () => unsubscribeDailySummaries();
            }, (error) => {
                console.error("Error fetching matches:", error);
                setErrorMessage("Error al cargar los partidos. Por favor, intenta de nuevo.");
            });

            return () => unsubscribeMatches();
        } else {
            setMatches([]); 
            setGroupedMatches({}); 
        }
    }, [userId]); 

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
            const dailySummaryDocRef = doc(db, `artifacts/${appId}/users/${userId}/dailySummaries`, date);
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

        const team1Players = [newMatch.team1Player1.value, newMatch.team1Player2.value];
        const team2Players = [newMatch.team2Player1.value, newMatch.team2Player2.value];
        const { date } = newMatch; 

        if (team1Players[0] === '' || team1Players[1] === '' ||
            team2Players[0] === '' || team2Players[1] === '' || !date) {
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
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/matches`), {
                team1Players, 
                team2Players, 
                scoreTeam1: score1, 
                scoreTeam2: score2, 
                date,
                winner,
                loadedBy: loadedByPlayer,
                timestamp: Timestamp.now(),
                editHistory: []
            });
            setNewMatch({
                team1Player1: { value: '', type: 'dropdown' },
                team1Player2: { value: '', type: 'dropdown' },
                team2Player1: { value: '', type: 'dropdown' },
                team2Player2: { value: '', type: 'dropdown' },
                scoreTeam1: '',
                scoreTeam2: '',
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
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/matches`, matchToDelete.id)); 
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
            team1Player1: { value: match.team1Players[0], type: isPredefinedPlayer(match.team1Players[0]) ? 'dropdown' : 'custom' },
            team1Player2: { value: match.team1Players[1], type: isPredefinedPlayer(match.team1Players[1]) ? 'dropdown' : 'custom' },
            team2Player1: { value: match.team2Players[0], type: isPredefinedPlayer(match.team2Players[0]) ? 'dropdown' : 'custom' },
            team2Player2: { value: match.team2Players[1], type: isPredefinedPlayer(match.team2Players[1]) ? 'dropdown' : 'custom' },
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

        const team1Players = [editedMatch.team1Player1.value, editedMatch.team1Player2.value];
        const team2Players = [editedMatch.team2Player1.value, editedMatch.team2Player2.value];
        const { date } = editedMatch; 

        if (team1Players[0] === '' || team1Players[1] === '' ||
            team2Players[0] === '' || team2Players[1] === '' || !date) {
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

        try {
            const newEditEntry = {
                editedBy: loadedByPlayer,
                editedTimestamp: Timestamp.now(),
            };

            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/matches`, editedMatch.id), {
                team1Players, 
                team2Players, 
                scoreTeam1: score1, 
                scoreTeam2: score2, 
                date,
                winner,
                editHistory: [...(editedMatch.editHistory || []), newEditEntry] 
            });
            setEditingMatchId(null);
            setEditedMatch(null);
            setErrorMessage('');
        } catch (e) {
            console.error("Error updating document: ", e);
            setErrorMessage("Error al actualizar el partido. Intenta de nuevo.");
        }
    };

    const toggleDateExpansion = (date) => {
        setExpandedDates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(date)) {
                newSet.delete(date);
            } else {
                newSet.add(date);
            }
            return newSet;
        });
    };

    const downloadMatchHistory = () => {
        if (matches.length === 0) {
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
            "Cargado por",
            "Historial de Ediciones"
        ];

        const rows = matches.map((match, index) => {
            const team1Player1Paid = groupedMatches[match.date]?.summary[match.team1Players[0]]?.paid ? 'Si' : 'No';
            const team1Player2Paid = groupedMatches[match.date]?.summary[match.team1Players[1]]?.paid ? 'Si' : 'No';
            const team2Player1Paid = groupedMatches[match.date]?.summary[match.team2Players[0]]?.paid ? 'Si' : 'No';
            const team2Player2Paid = groupedMatches[match.date]?.summary[match.team2Players[1]]?.paid ? 'Si' : 'No';

            const score1 = match.scoreTeam1 !== '' ? match.scoreTeam1 : 'N/A';
            const score2 = match.scoreTeam2 !== '' ? match.scoreTeam2 : 'N/A';

            const team1Won = match.winner.startsWith('Equipo 1') ? 'Si' : 'No';
            const team2Won = match.winner.startsWith('Equipo 2') ? 'Si' : 'No';
            
            const loadedBy = match.loadedBy || 'Desconocido';
            
            const editHistoryString = (match.editHistory || [])
                .map(edit => `${edit.editedBy} (${new Date(edit.editedTimestamp.toDate()).toLocaleString()})`)
                .join('; ');

            return [
                index + 1,
                match.date,
                match.team1Players[0],
                team1Player1Paid,
                match.team1Players[1],
                team1Player2Paid,
                match.team2Players[0],
                team2Player1Paid,
                match.team2Players[1],
                team2Player2Paid,
                score1,
                score2,
                team1Won,
                team2Won,
                loadedBy,
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
            date: new Date().toISOString().split('T')[0],
        });
        setEditingMatchId(null);
        setEditedMatch(null);
        setExpandedDates(new Set());
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-600 text-white font-inter">
                <p>Cargando aplicacion...</p>
            </div>
        );
    }

    if (showWelcomeScreen) {
        return (
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
                    <button
                        onClick={handleWelcomeEnter}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                    >
                        <LogIn className="mr-3" size={24} /> Ingresar
                    </button>
                </div>
            </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

                {Object.keys(groupedMatches).length === 0 ? (
                    <p className="text-center text-gray-500">No hay resumenes de partidos disponibles.</p>
                ) : (
                    Object.entries(groupedMatches).sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA)).map(([date, data]) => (
                        <div key={date} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl mb-8 border border-purple-200">
                            <button 
                                onClick={() => toggleDateExpansion(date)}
                                className="w-full flex justify-between items-center text-3xl font-bold text-purple-800 mb-4 text-center bg-purple-100 p-3 rounded-lg hover:bg-purple-200 transition-colors duration-200"
                            >
                                <span>Fecha: {date} ({data.matches.length} partidos)</span>
                                {expandedDates.has(date) ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </button>
                            
                            {expandedDates.has(date) && (
                                <>
                                    <h4 className="text-xl font-semibold text-blue-700 mb-3">Partidos del Dia:</h4>
                                    <div className="grid grid-cols-1 gap-3 mb-6">
                                        {data.matches.map((match) => (
                                            <div key={match.id} className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-100">
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
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                                                        <p className="text-md font-semibold text-blue-800 mb-1">
                                                            {match.team1Players.join(' y ')} vs {match.team2Players.join(' y ')}
                                                        </p>
                                                        <p className="text-lg font-bold text-purple-600 mb-1">
                                                            Resultado: {match.scoreTeam1 !== '' && match.scoreTeam2 !== '' ? `${match.scoreTeam1} - ${match.scoreTeam2}` : 'Puntuacion no registrada'}
                                                        </p>
                                                        <p className="text-sm text-green-700 font-semibold mb-2">
                                                            Ganador: {match.winner !== 'N/A' ? match.winner : 'No determinado'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Cargado por: <span className="font-semibold">{match.loadedBy || 'Desconocido'}</span> el <span className="font-semibold">{match.timestamp ? new Date(match.timestamp.toDate()).toLocaleString() : 'N/A'}</span>
                                                        </p>
                                                        {match.editHistory && match.editHistory.length > 0 && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Historial de Ediciones:
                                                                <ul className="list-disc list-inside ml-2">
                                                                    {match.editHistory.map((edit, idx) => (
                                                                        <li key={idx}>
                                                                            <span className="font-semibold">{edit.editedBy}</span> el <span className="font-semibold">{edit.editedTimestamp ? new Date(edit.editedTimestamp.toDate()).toLocaleString() : 'N/A'}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
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
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <h4 className="text-xl font-semibold text-blue-700 mb-3">Resumen de Jugadores:</h4>
                                    {Object.keys(data.summary).length === 0 ? (
                                        <p className="text-gray-500">No hay datos de resumen para esta fecha.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {Object.entries(data.summary).map(([player, stats]) => (
                                                <div key={player} className="bg-blue-100 p-3 rounded-lg shadow-sm border border-blue-200 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-blue-800">{player}</p>
                                                        <p className="text-gray-700">Jugados: {stats.played}</p>
                                                        <p className="text-green-700">Ganados: {stats.won}</p>
                                                        <p className="text-red-700">Perdidos: {stats.lost}</p>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <label htmlFor={`paid-${date}-${player}`} className="mr-2 text-gray-700">Pago:</label>
                                                        <input
                                                            type="checkbox"
                                                            id={`paid-${date}-${player}`}
                                                            checked={stats.paid || false}
                                                            onChange={(e) => handlePaidChange(date, player, e.target.checked)}
                                                            className="form-checkbox h-5 w-5 text-green-600 rounded focus:ring-green-500"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar Eliminacion</h3>
                        <p className="text-gray-600 mb-6">
                            Estas seguro de que quieres eliminar el partido del {matchToDelete?.date} entre {matchToDelete?.team1Players.join(' y ')} vs {matchToDelete?.team2Players.join(' y ')}?
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
    );
}

export default App;