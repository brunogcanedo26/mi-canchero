import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import {
    collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDoc, setDoc
} from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { Calendar, Users, Trophy, PlusCircle, LogOut, CheckCircle, XCircle } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const App = () => {
    // Estados existentes
    const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
    const [userId, setUserId] = useState(null);
    const [matches, setMatches] = useState([]);
    const [newMatch, setNewMatch] = useState({
        team1Player1: { value: '', isCustom: false },
        team1Player2: { value: '', isCustom: false },
        team2Player1: { value: '', isCustom: false },
        team2Player2: { value: '', isCustom: false },
        scoreTeam1: '',
        scoreTeam2: '',
        comment: '',
        date: new Date().toLocaleDateString('en-CA'),
    });
    const [editingMatchId, setEditingMatchId] = useState(null);
    const [editedMatch, setEditedMatch] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [showStats, setShowStats] = useState(false);
    const [statsYearFilter, setStatsYearFilter] = useState('');
    const [statsMonthFilter, setStatsMonthFilter] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);
    const [showMatchList, setShowMatchList] = useState(false);
    const [visibleMatchesCount, setVisibleMatchesCount] = useState(10);
    const [showNoCancheroScreen, setShowNoCancheroScreen] = useState(false);
    const [noCancheroMatch, setNoCancheroMatch] = useState({
        team1Player1: { value: '', isCustom: false },
        team1Player2: { value: '', isCustom: false },
        team2Player1: { value: '', isCustom: false },
        team2Player2: { value: '', isCustom: false },
        scoreTeam1: '',
        scoreTeam2: '',
        loadedBy: '',
        date: new Date().toLocaleDateString('en-CA'),
    });

    // Nuevos estados para autenticación y selección de club
    const [showLoginScreen, setShowLoginScreen] = useState(true);
    const [showRegisterScreen, setShowRegisterScreen] = useState(false);
    const [showClubSelectionScreen, setShowClubSelectionScreen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [registerName, setRegisterName] = useState('');
    const [registerSurname, setRegisterSurname] = useState('');
    const [registerNickname, setRegisterNickname] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerClubRequests, setRegisterClubRequests] = useState({
        club1: false,
        club2: false,
        club3: false
    });
    const [selectedClub, setSelectedClub] = useState(null);
    const [approvedClubs, setApprovedClubs] = useState([]);
    const [authError, setAuthError] = useState('');
    const clubList = ['club1', 'club2', 'club3'];

    // Lista de jugadores estática (puedes moverla a Firestore más adelante)
    const playerList = [
        { name: 'Bruno', club: 'club1' },
        { name: 'Juan', club: 'club1' },
        { name: 'Pedro', club: 'club2' },
        { name: 'Lucas', club: 'club3' }
    ];

    // Estado para el jugador seleccionado en la pantalla de bienvenida
    const [selectedWelcomePlayer, setSelectedWelcomePlayer] = useState('');
    const [welcomePin, setWelcomePin] = useState('');
    const [welcomeScreenError, setWelcomeScreenError] = useState('');
    const [customWelcomePlayerName, setCustomWelcomePlayerName] = useState('');
    const [loadedByPlayer, setLoadedByPlayer] = useState('');

    // Lista de PINs estática (puedes moverla a Firestore más adelante)
    const pins = {
        'Bruno': { pin: '1234', club: 'club1' },
        'Juan': { pin: '5678', club: 'club1' },
        'Pedro': { pin: '4321', club: 'club2' },
        'Lucas': { pin: '9876', club: 'club3' }
    };

    // Escuchar cambios de autenticación
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                setShowLoginScreen(false);
                // Obtener clubes aprobados del usuario
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setApprovedClubs(userData.approvedClubs || []);
                    setShowClubSelectionScreen(true);
                }
            } else {
                setUserId(null);
                setShowLoginScreen(true);
                setShowClubSelectionScreen(false);
                setSelectedClub(null);
                setApprovedClubs([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Cargar partidos según el club seleccionado
    useEffect(() => {
        if (!userId || !selectedClub) return;
        const q = query(
            collection(db, `clubs/${selectedClub}/matches`),
            where('deleted', '==', false),
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matchesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMatches(matchesData);
        });
        return () => unsubscribe();
    }, [userId, selectedClub]);

    // Manejar registro de usuario
    const handleRegister = async () => {
        setAuthError('');
        if (!registerName || !registerSurname || !registerNickname || !registerEmail || !registerPassword) {
            setAuthError('Por favor, completa todos los campos.');
            return;
        }
        if (!Object.values(registerClubRequests).some(request => request)) {
            setAuthError('Selecciona al menos un club.');
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
            const user = userCredential.user;
            await setDoc(doc(db, 'users', user.uid), {
                name: registerName,
                surname: registerSurname,
                nickname: registerNickname,
                email: registerEmail,
                clubRequests: registerClubRequests,
                approvedClubs: [],
                createdAt: new Date()
            });
            setAuthError('Registro exitoso. Espera la validación del administrador.');
            setShowRegisterScreen(false);
            setRegisterName('');
            setRegisterSurname('');
            setRegisterNickname('');
            setRegisterEmail('');
            setRegisterPassword('');
            setRegisterClubRequests({ club1: false, club2: false, club3: false });
        } catch (error) {
            setAuthError(error.message);
        }
    };

    // Manejar inicio de sesión
    const handleLogin = async () => {
        setAuthError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setAuthError('Email o contraseña incorrectos.');
        }
    };

    // Manejar selección de club
    const handleClubSelection = (club) => {
        setSelectedClub(club);
        setShowClubSelectionScreen(false);
        setShowWelcomeScreen(true);
    };

    // Manejar logout
    const handleLogout = async () => {
        await signOut(auth);
        window.location.reload();
    };

    // Funciones existentes (adaptadas para el club seleccionado)
    const handleWelcomeEnter = () => {
        if (!selectedWelcomePlayer) {
            setWelcomeScreenError('Por favor, selecciona un jugador.');
            return;
        }
        const playerName = selectedWelcomePlayer === 'Otro' ? customWelcomePlayerName : selectedWelcomePlayer;
        if (!playerName) {
            setWelcomeScreenError('Por favor, ingresa un nombre válido.');
            return;
        }
        const validPin = pins[playerName] && pins[playerName].club === selectedClub && pins[playerName].pin === welcomePin;
        if (validPin || (selectedWelcomePlayer === 'Otro' && welcomePin === '0000')) {
            setUserId('authenticated_user');
            setLoadedByPlayer(playerName);
            setShowWelcomeScreen(false);
            setWelcomeScreenError('');
        } else {
            setWelcomeScreenError('PIN incorrecto. Intenta de nuevo.');
        }
    };

    const handleAddMatch = async () => {
        if (
            !newMatch.team1Player1.value || !newMatch.team1Player2.value ||
            !newMatch.team2Player1.value || !newMatch.team2Player2.value ||
            !newMatch.scoreTeam1 || !newMatch.scoreTeam2
        ) {
            setErrorMessage('Por favor, completa todos los campos obligatorios.');
            return;
        }
        try {
            await addDoc(collection(db, `clubs/${selectedClub}/matches`), {
                team1Players: [
                    newMatch.team1Player1.isCustom ? newMatch.team1Player1.value : playerList.find(p => p.name === newMatch.team1Player1.value)?.name,
                    newMatch.team1Player2.isCustom ? newMatch.team1Player2.value : playerList.find(p => p.name === newMatch.team1Player2.value)?.name
                ],
                team2Players: [
                    newMatch.team2Player1.isCustom ? newMatch.team2Player1.value : playerList.find(p => p.name === newMatch.team2Player1.value)?.name,
                    newMatch.team2Player2.isCustom ? newMatch.team2Player2.value : playerList.find(p => p.name === newMatch.team2Player1.value)?.name
                ],
                scoreTeam1: parseInt(newMatch.scoreTeam1),
                scoreTeam2: parseInt(newMatch.scoreTeam2),
                comment: newMatch.comment,
                date: newMatch.date,
                loadedBy: loadedByPlayer,
                timestamp: new Date(),
                deleted: false,
                club: selectedClub
            });
            setNewMatch({
                team1Player1: { value: '', isCustom: false },
                team1Player2: { value: '', isCustom: false },
                team2Player1: { value: '', isCustom: false },
                team2Player2: { value: '', isCustom: false },
                scoreTeam1: '',
                scoreTeam2: '',
                comment: '',
                date: new Date().toLocaleDateString('en-CA'),
            });
            setErrorMessage('');
            setConfirmationMessage('Partido registrado con éxito.');
        } catch (error) {
            setErrorMessage('Error al registrar el partido: ' + error.message);
        }
    };

    const handleEditMatch = (match) => {
        setEditingMatchId(match.id);
        setEditedMatch({
            team1Player1: { value: match.team1Players[0], isCustom: !playerList.some(p => p.name === match.team1Players[0]) },
            team1Player2: { value: match.team1Players[1], isCustom: !playerList.some(p => p.name === match.team1Players[1]) },
            team2Player1: { value: match.team2Players[0], isCustom: !playerList.some(p => p.name === match.team2Players[0]) },
            team2Player2: { value: match.team2Players[1], isCustom: !playerList.some(p => p.name === match.team2Players[1]) },
            scoreTeam1: match.scoreTeam1.toString(),
            scoreTeam2: match.scoreTeam2.toString(),
            comment: match.comment,
            date: match.date
        });
    };

    const handleSaveEditedMatch = async () => {
        if (
            !editedMatch.team1Player1.value || !editedMatch.team1Player2.value ||
            !editedMatch.team2Player1.value || !editedMatch.team2Player2.value ||
            !editedMatch.scoreTeam1 || !editedMatch.scoreTeam2
        ) {
            setErrorMessage('Por favor, completa todos los campos obligatorios.');
            return;
        }
        try {
            await updateDoc(doc(db, `clubs/${selectedClub}/matches`, editingMatchId), {
                team1Players: [
                    editedMatch.team1Player1.isCustom ? editedMatch.team1Player1.value : playerList.find(p => p.name === editedMatch.team1Player1.value)?.name,
                    editedMatch.team1Player2.isCustom ? editedMatch.team1Player2.value : playerList.find(p => p.name === editedMatch.team1Player2.value)?.name
                ],
                team2Players: [
                    editedMatch.team2Player1.isCustom ? editedMatch.team2Player1.value : playerList.find(p => p.name === editedMatch.team2Player1.value)?.name,
                    editedMatch.team2Player2.isCustom ? editedMatch.team2Player2.value : playerList.find(p => p.name === editedMatch.team2Player1.value)?.name
                ],
                scoreTeam1: parseInt(editedMatch.scoreTeam1),
                scoreTeam2: parseInt(editedMatch.scoreTeam2),
                comment: editedMatch.comment,
                date: editedMatch.date,
                loadedBy: loadedByPlayer,
                timestamp: new Date()
            });
            setEditingMatchId(null);
            setEditedMatch(null);
            setErrorMessage('');
            setConfirmationMessage('Partido actualizado con éxito.');
        } catch (error) {
            setErrorMessage('Error al actualizar el partido: ' + error.message);
        }
    };

    const handleDeleteMatch = async (matchId) => {
        try {
            await updateDoc(doc(db, `clubs/${selectedClub}/matches`, matchId), {
                deleted: true
            });
            setConfirmationMessage('Partido eliminado con éxito.');
        } catch (error) {
            setErrorMessage('Error al eliminar el partido: ' + error.message);
        }
    };

    const calculatePlayerStats = () => {
        const playerStats = {};
        matches
            .filter(match => match.club === selectedClub)
            .forEach(match => {
                const team1Players = match.team1Players;
                const team2Players = match.team2Players;
                const scoreTeam1 = match.scoreTeam1;
                const scoreTeam2 = match.scoreTeam2;

                team1Players.forEach(player => {
                    if (!playerStats[player]) {
                        playerStats[player] = { wins: 0, losses: 0, matchesPlayed: 0, pointsFor: 0, pointsAgainst: 0 };
                    }
                    playerStats[player].matchesPlayed += 1;
                    playerStats[player].pointsFor += scoreTeam1;
                    playerStats[player].pointsAgainst += scoreTeam2;
                    if (scoreTeam1 > scoreTeam2) {
                        playerStats[player].wins += 1;
                    } else {
                        playerStats[player].losses += 1;
                    }
                });

                team2Players.forEach(player => {
                    if (!playerStats[player]) {
                        playerStats[player] = { wins: 0, losses: 0, matchesPlayed: 0, pointsFor: 0, pointsAgainst: 0 };
                    }
                    playerStats[player].matchesPlayed += 1;
                    playerStats[player].pointsFor += scoreTeam2;
                    playerStats[player].pointsAgainst += scoreTeam1;
                    if (scoreTeam2 > scoreTeam1) {
                        playerStats[player].wins += 1;
                    } else {
                        playerStats[player].losses += 1;
                    }
                });
            });

        return Object.entries(playerStats)
            .map(([player, stats]) => ({
                player,
                ...stats,
                winPercentage: stats.matchesPlayed > 0 ? ((stats.wins / stats.matchesPlayed) * 100).toFixed(2) : 0
            }))
            .sort((a, b) => b.winPercentage - a.winPercentage || b.pointsFor - b.pointsFor);
    };

    const getMatchDates = () => {
        const dates = new Set();
        matches
            .filter(match => match.club === selectedClub)
            .forEach(match => {
                if (match.date) {
                    dates.add(match.date);
                }
            });
        return Array.from(dates).map(date => new Date(date));
    };

    const handleAddNoCancheroMatch = async () => {
        if (
            !noCancheroMatch.team1Player1.value || !noCancheroMatch.team1Player2.value ||
            !noCancheroMatch.team2Player1.value || !noCancheroMatch.team2Player2.value ||
            !noCancheroMatch.scoreTeam1 || !noCancheroMatch.scoreTeam2
        ) {
            setErrorMessage('Por favor, completa todos los campos obligatorios.');
            return;
        }
        try {
            await addDoc(collection(db, `clubs/${selectedClub}/matches`), {
                team1Players: [
                    noCancheroMatch.team1Player1.isCustom ? noCancheroMatch.team1Player1.value : playerList.find(p => p.name === noCancheroMatch.team1Player1.value)?.name,
                    noCancheroMatch.team1Player2.isCustom ? noCancheroMatch.team1Player2.value : playerList.find(p => p.name === noCancheroMatch.team1Player2.value)?.name
                ],
                team2Players: [
                    noCancheroMatch.team2Player1.isCustom ? noCancheroMatch.team2Player1.value : playerList.find(p => p.name === noCancheroMatch.team2Player1.value)?.name,
                    noCancheroMatch.team2Player2.isCustom ? noCancheroMatch.team2Player2.value : playerList.find(p => p.name === noCancheroMatch.team2Player1.value)?.name
                ],
                scoreTeam1: parseInt(noCancheroMatch.scoreTeam1),
                scoreTeam2: parseInt(noCancheroMatch.scoreTeam2),
                loadedBy: noCancheroMatch.loadedBy,
                date: noCancheroMatch.date,
                timestamp: new Date(),
                deleted: false,
                club: selectedClub
            });
            setNoCancheroMatch({
                team1Player1: { value: '', isCustom: false },
                team1Player2: { value: '', isCustom: false },
                team2Player1: { value: '', isCustom: false },
                team2Player2: { value: '', isCustom: false },
                scoreTeam1: '',
                scoreTeam2: '',
                loadedBy: '',
                date: new Date().toLocaleDateString('en-CA'),
            });
            setErrorMessage('');
            setConfirmationMessage('Partido sin canchero registrado con éxito.');
        } catch (error) {
            setErrorMessage('Error al registrar el partido: ' + error.message);
        }
    };

    const CopyrightFooter = () => (
        <footer className="text-gray-400 text-sm mt-8">
            &copy; {new Date().getFullYear()} Mi Canchero. Todos los derechos reservados.
        </footer>
    );

    // Pantalla de registro
    if (showRegisterScreen) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold text-white mb-8">Registro - Mi Canchero</h1>
                <div className="w-full max-w-md">
                    <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Nombre"
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
                    />
                    <input
                        type="text"
                        value={registerSurname}
                        onChange={(e) => setRegisterSurname(e.target.value)}
                        placeholder="Apellido"
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
                    />
                    <input
                        type="text"
                        value={registerNickname}
                        onChange={(e) => setRegisterNickname(e.target.value)}
                        placeholder="Apodo"
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
                    />
                    <input
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="Email"
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
                    />
                    <input
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
                    />
                    <div className="mb-4">
                        <p className="text-white mb-2">Selecciona los clubes:</p>
                        {clubList.map(club => (
                            <label key={club} className="flex items-center text-white mb-2">
                                <input
                                    type="checkbox"
                                    checked={registerClubRequests[club]}
                                    onChange={() => setRegisterClubRequests({
                                        ...registerClubRequests,
                                        [club]: !registerClubRequests[club]
                                    })}
                                    className="mr-2"
                                />
                                {club.charAt(0).toUpperCase() + club.slice(1)}
                            </label>
                        ))}
                    </div>
                    <button
                        onClick={handleRegister}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full transform transition-transform duration-200 hover:scale-105"
                    >
                        Registrarse
                    </button>
                    <button
                        onClick={() => {
                            setShowRegisterScreen(false);
                            setAuthError('');
                        }}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mt-2 transform transition-transform duration-200 hover:scale-105"
                    >
                        Volver al inicio de sesión
                    </button>
                    {authError && <p className="text-red-500 text-center mt-4">{authError}</p>}
                </div>
                <CopyrightFooter />
            </div>
        );
    }

    // Pantalla de inicio de sesión
    if (showLoginScreen) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold text-white mb-8">Iniciar Sesión - Mi Canchero</h1>
                <div className="w-full max-w-md">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleLogin();
                            }
                        }}
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleLogin();
                            }
                        }}
                    />
                    <button
                        onClick={handleLogin}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full transform transition-transform duration-200 hover:scale-105"
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        onClick={() => {
                            setShowRegisterScreen(true);
                            setAuthError('');
                        }}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mt-2 transform transition-transform duration-200 hover:scale-105"
                    >
                        Registrarse
                    </button>
                    {authError && <p className="text-red-500 text-center mt-4">{authError}</p>}
                </div>
                <CopyrightFooter />
            </div>
        );
    }

    // Pantalla de selección de club
    if (showClubSelectionScreen) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold text-white mb-8">Selecciona tu Club - Mi Canchero</h1>
                <div className="w-full max-w-md">
                    {approvedClubs.length === 0 ? (
                        <p className="text-white text-center">No tienes clubes aprobados. Contacta al administrador.</p>
                    ) : (
                        approvedClubs.map(club => (
                            <button
                                key={club}
                                onClick={() => handleClubSelection(club)}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mb-2 transform transition-transform duration-200 hover:scale-105"
                            >
                                {club.charAt(0).toUpperCase() + club.slice(1)}
                            </button>
                        ))
                    )}
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mt-4 transform transition-transform duration-200 hover:scale-105"
                    >
                        <LogOut className="mr-2 inline" size={20} /> Cerrar Sesión
                    </button>
                </div>
                <CopyrightFooter />
            </div>
        );
    }

    // Pantalla de bienvenida (adaptada para el club seleccionado)
    if (showWelcomeScreen) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold text-white mb-8">
                    Bienvenido a Mi Canchero - {selectedClub.charAt(0).toUpperCase() + selectedClub.slice(1)}
                </h1>
                <div className="w-full max-w-md">
                    <select
                        value={selectedWelcomePlayer}
                        onChange={(e) => {
                            setSelectedWelcomePlayer(e.target.value);
                            setWelcomePin('');
                            setCustomWelcomePlayerName('');
                            setWelcomeScreenError('');
                        }}
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
                    >
                        <option value="">Selecciona un jugador</option>
                        {playerList.filter(player => player.club === selectedClub).map((player, index) => (
                            <option key={index} value={player.name}>{player.name}</option>
                        ))}
                        <option value="Otro">Otro</option>
                    </select>
                    {selectedWelcomePlayer === 'Otro' && (
                        <input
                            type="text"
                            value={customWelcomePlayerName}
                            onChange={(e) => setCustomWelcomePlayerName(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
                            placeholder="Escribe el nombre del jugador"
                        />
                    )}
                    <input
                        type="password"
                        id="welcome-pin-input"
                        value={welcomePin}
                        onChange={(e) => setWelcomePin(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleWelcomeEnter();
                            }
                        }}
                        maxLength="4"
                        className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg text-center tracking-widest mb-4"
                        placeholder="****"
                    />
                    <button
                        onClick={handleWelcomeEnter}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full transform transition-transform duration-200 hover:scale-105"
                    >
                        Ingresar
                    </button>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mt-2 transform transition-transform duration-200 hover:scale-105"
                    >
                        <LogOut className="mr-2 inline" size={20} /> Cerrar Sesión
                    </button>
                    {welcomeScreenError && (
                        <p className="text-red-500 text-center mt-4">{welcomeScreenError}</p>
                    )}
                </div>
                <CopyrightFooter />
            </div>
        );
    }

    // Pantalla principal (sin cambios significativos, pero adaptada para el club)
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold text-white mb-8">Mi Canchero - {selectedClub.charAt(0).toUpperCase() + selectedClub.slice(1)}</h1>
            <div className="w-full max-w-md">
                <button
                    onClick={() => setShowNoCancheroScreen(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mb-4 transform transition-transform duration-200 hover:scale-105"
                >
                    <PlusCircle className="mr-2 inline" size={20} /> Registrar Partido sin Canchero
                </button>
                <button
                    onClick={() => setShowStats(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mb-4 transform transition-transform duration-200 hover:scale-105"
                >
                    <Trophy className="mr-2 inline" size={20} /> Ver Estadísticas
                </button>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full transform transition-transform duration-200 hover:scale-105"
                >
                    <LogOut className="mr-2 inline" size={20} /> Salir
                </button>
            </div>
            {showNoCancheroScreen && (
                <div className="w-full max-w-md mt-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Registrar Partido sin Canchero</h2>
                    <div className="mb-4">
                        <label className="block text-white text-sm font-bold mb-2">Equipo 1 - Jugador 1</label>
                        <select
                            value={noCancheroMatch.team1Player1.value}
                            onChange={(e) => {
                                const value = e.target.value;
                                setNoCancheroMatch({
                                    ...noCancheroMatch,
                                    team1Player1: { value, isCustom: value === 'Otro' }
                                });
                            }}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="">Selecciona un jugador</option>
                            {playerList.filter(player => player.club === selectedClub).map((player, index) => (
                                <option key={index} value={player.name}>{player.name}</option>
                            ))}
                            <option value="Otro">Otro</option>
                        </select>
                        {noCancheroMatch.team1Player1.value === 'Otro' && (
                            <input
                                type="text"
                                value={noCancheroMatch.team1Player1.value}
                                onChange={(e) => setNoCancheroMatch({
                                    ...noCancheroMatch,
                                    team1Player1: { value: e.target.value, isCustom: true }
                                })}
                                className="mt-2 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Escribe el nombre del jugador"
                            />
                        )}
                    </div>
                    {/* Repite para team1Player2, team2Player1, team2Player2 */}
                    <div className="mb-4">
                        <label className="block text-white text-sm font-bold mb-2">Puntaje Equipo 1</label>
                        <input
                            type="number"
                            value={noCancheroMatch.scoreTeam1}
                            onChange={(e) => setNoCancheroMatch({ ...noCancheroMatch, scoreTeam1: e.target.value })}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-white text-sm font-bold mb-2">Puntaje Equipo 2</label>
                        <input
                            type="number"
                            value={noCancheroMatch.scoreTeam2}
                            onChange={(e) => setNoCancheroMatch({ ...noCancheroMatch, scoreTeam2: e.target.value })}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-white text-sm font-bold mb-2">Cargado por</label>
                        <input
                            type="text"
                            value={noCancheroMatch.loadedBy}
                            onChange={(e) => setNoCancheroMatch({ ...noCancheroMatch, loadedBy: e.target.value })}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-white text-sm font-bold mb-2">Fecha</label>
                        <input
                            type="date"
                            value={noCancheroMatch.date}
                            onChange={(e) => setNoCancheroMatch({ ...noCancheroMatch, date: e.target.value })}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <button
                        onClick={handleAddNoCancheroMatch}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full transform transition-transform duration-200 hover:scale-105"
                    >
                        <CheckCircle className="mr-2 inline" size={20} /> Registrar Partido
                    </button>
                    <button
                        onClick={() => {
                            setShowNoCancheroScreen(false);
                            window.location.reload();
                        }}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mt-2 transform transition-transform duration-200 hover:scale-105"
                    >
                        <LogOut className="mr-2 inline" size={20} /> Volver
                    </button>
                    {errorMessage && <p className="text-red-500 text-center mt-4">{errorMessage}</p>}
                    {confirmationMessage && <p className="text-green-500 text-center mt-4">{confirmationMessage}</p>}
                </div>
            )}
            {showStats && (
                <div className="w-full max-w-4xl mt-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Estadísticas - {selectedClub.charAt(0).toUpperCase() + selectedClub.slice(1)}</h2>
                    <div className="mb-4">
                        <label className="block text-white text-sm font-bold mb-2">Filtrar por año</label>
                        <select
                            value={statsYearFilter}
                            onChange={(e) => setStatsYearFilter(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="">Todos los años</option>
                            {[...new Set(matches.map(match => match.date.split('-')[0]))].sort().map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-white text-sm font-bold mb-2">Filtrar por mes</label>
                        <select
                            value={statsMonthFilter}
                            onChange={(e) => setStatsMonthFilter(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="">Todos los meses</option>
                            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            highlightDates={getMatchDates()}
                            dateFormat="yyyy-MM-dd"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholderText="Selecciona una fecha"
                        />
                    </div>
                    <button
                        onClick={() => setShowMatchList(!showMatchList)}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mb-4 transform transition-transform duration-200 hover:scale-105"
                    >
                        {showMatchList ? 'Ocultar Lista de Partidos' : 'Mostrar Lista de Partidos'}
                    </button>
                    {showMatchList && (
                        <div>
                            {matches
                                .filter(match => {
                                    if (statsYearFilter && match.date.split('-')[0] !== statsYearFilter) return false;
                                    if (statsMonthFilter && match.date.split('-')[1] !== statsMonthFilter) return false;
                                    if (selectedDate && match.date !== selectedDate.toLocaleDateString('en-CA')) return false;
                                    return true;
                                })
                                .slice(0, visibleMatchesCount)
                                .map(match => (
                                    <div key={match.id} className="bg-gray-700 p-4 rounded-lg mb-4">
                                        <p className="text-white">
                                            {match.team1Players.join(' y ')} vs {match.team2Players.join(' y ')}: {match.scoreTeam1} - {match.scoreTeam2}
                                        </p>
                                        <p className="text-gray-400">Fecha: {match.date}</p>
                                        <p className="text-gray-400">Cargado por: {match.loadedBy}</p>
                                        {match.comment && <p className="text-gray-400">Comentario: {match.comment}</p>}
                                        <button
                                            onClick={() => handleEditMatch(match)}
                                            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded mt-2 mr-2"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMatch(match.id)}
                                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mt-2"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                ))}
                            {visibleMatchesCount < matches.length && (
                                <button
                                    onClick={() => setVisibleMatchesCount(visibleMatchesCount + 10)}
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full transform transition-transform duration-200 hover:scale-105"
                                >
                                    Cargar más
                                </button>
                            )}
                        </div>
                    )}
                    <h3 className="text-xl font-bold text-white mt-4">Ranking de Jugadores</h3>
                    <table className="w-full text-white">
                        <thead>
                            <tr>
                                <th className="text-left">Jugador</th>
                                <th className="text-left">Victorias</th>
                                <th className="text-left">Derrotas</th>
                                <th className="text-left">Partidos</th>
                                <th className="text-left">% Victorias</th>
                                <th className="text-left">Puntos a Favor</th>
                                <th className="text-left">Puntos en Contra</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculatePlayerStats().map((stat, index) => (
                                <tr key={index}>
                                    <td>{stat.player}</td>
                                    <td>{stat.wins}</td>
                                    <td>{stat.losses}</td>
                                    <td>{stat.matchesPlayed}</td>
                                    <td>{stat.winPercentage}%</td>
                                    <td>{stat.pointsFor}</td>
                                    <td>{stat.pointsAgainst}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button
                        onClick={() => {
                            setShowStats(false);
                            window.location.reload();
                        }}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full mt-4 transform transition-transform duration-200 hover:scale-105"
                    >
                        <LogOut className="mr-2 inline" size={20} /> Volver
                    </button>
                </div>
            )}
            {errorMessage && <p className="text-red-500 text-center mt-4">{errorMessage}</p>}
            {confirmationMessage && <p className="text-green-500 text-center mt-4">{confirmationMessage}</p>}
            <CopyrightFooter />
        </div>
    );
};

export default App;