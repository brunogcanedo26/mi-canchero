import React, { useState, useEffect, useMemo } from 'react';
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
 Timestamp,
 query,
 limit,
 where,
 enableIndexedDbPersistence
} from 'firebase/firestore';
import { PlusCircle, Trash2, Edit, Save, XCircle, Download, LogIn, LogOut, BarChart2, UserPlus, ArrowLeft } from 'lucide-react';
import Calendar from 'react-calendar';
import './styles/Calendar.css';
import './styles/Watermark.css';
import emailjs from '@emailjs/browser';

// Firebase configuration and initialization
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch((err) => {
 console.error("Error enabling Firestore persistence:", err);
});
const auth = getAuth(app);

// Global variables for Canvas environment
const appId = process.env.REACT_APP_APP_ID || 'default-app-id';

// Mapeo de jugadores a sus imágenes
const playerImages = {
  "Ale Perrone": "/images/players/anonimo.png",
  "Alexis": "/images/players/anonimo.png",
  "Ariel": "/images/players/anonimo.png",
  "Bruno": "/images/players/bruno4.png",
  "Condor": "/images/players/anonimo.png",
  "Coreano": "/images/players/anonimo.png",
  "Daniel": "/images/players/anonimo.png",
  "Diego Balazo": "/images/players/anonimo.png",
  "Elvis": "/images/players/anonimo.png",
  "Ezequiel": "/images/players/anonimo.png",
  "Facundo": "/images/players/anonimo.png",
  "Federico": "/images/players/anonimo.png",
  "Fito": "/images/players/anonimo.png",
  "Franco": "/images/players/anonimo.png",
  "Gaby Mecanico": "/images/players/gaby_mecanico.png",
  "German": "/images/players/german.png",
  "Guillermo": "/images/players/guillermo.png",
  "Hector Musico": "/images/players/hector_musico.png",
  "Hugo": "/images/players/hugo.png",
  "Ivan": "/images/players/ivan.png",
  "Javier": "/images/players/javier.png",
  "Joni": "/images/players/joni.png",
  "Julian Olivieri": "/images/players/julian_olivieri.png",
  "Julian Rugna": "/images/players/julian_rugna.png",
  "Lautaro": "/images/players/lautaro.png",
  "Leandro": "/images/players/leandro.png",
  "Lucy": "/images/players/lucy.png",
  "Luigi": "/images/players/luigi.png",
  "Luis": "/images/players/luis.png",
  "Marcelo": "/images/players/marcelo.png",
  "Marcelo Zurdo": "/images/players/marcelo_zurdo.png",
  "Mariano": "/images/players/mariano.png",
  "Mario Arriola": "/images/players/mario_arriola.png",
  "Martin": "/images/players/martin.png",
  "Matias": "/images/players/matias.png",
  "Maxi": "/images/players/maxi.png",
  "Mono": "/images/players/mono.png",
  "Nacho": "/images/players/nacho.png",
  "Nico Ciudad": "/images/players/nico_ciudad.png",
  "Raul": "/images/players/raul.png",
  "Roberto": "/images/players/roberto.png",
  "Rodrigo": "/images/players/rodrigo.png",
  "Ruben": "/images/players/ruben.png",
  "Sergio": "/images/players/sergio.png",
  "Sosa": "/images/players/sosa.png",
  "Tano": "/images/players/tano.png",
  "Tito": "/images/players/tito.png",
  "Vasco": "/images/players/vasco.png",
  "Zurdo Diaz": "/images/players/zurdo_diaz.png",
  "Zurdo Ruben": "/images/players/zurdo_ruben.png"
};

// Función para obtener la imagen de un jugador
const getPlayerImage = (playerName) => {
  return playerImages[playerName] || "/images/players/default.png";
};

// Componente para la vista reducida de un partido
const MatchCardReduced = ({ match, onClick }) => {
  const team1Players = match.team1Players || [];
  const team2Players = match.team2Players || [];
  const scoreTeam1 = match.scoreTeam1 !== '' ? match.scoreTeam1 : '?';
  const scoreTeam2 = match.scoreTeam2 !== '' ? match.scoreTeam2 : '?';
  
  return (
    <div 
      className="bg-white rounded-lg shadow-md p-3 mb-3 cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      {/* Versión móvil - Diseño dividido en dos mitades */}
      <div className="md:hidden">
        <div className="flex h-full">
          {/* Mitad izquierda - Equipo 1 */}
          <div className="w-1/2 flex flex-col items-center justify-center pr-2 border-r border-gray-300">
            <div className="text-center">
              <div className="font-medium text-sm truncate">{team1Players[0] || 'Jugador 1'}</div>
              <div className="font-medium text-sm truncate">{team1Players[1] || 'Jugador 2'}</div>
              <div className="text-lg md:text-xl font-bold text-blue-600 mt-1">
                {scoreTeam1}
              </div>
            </div>
          </div>
          
          {/* Mitad derecha - Equipo 2 */}
          <div className="w-1/2 flex flex-col items-center justify-center pl-2">
            <div className="text-center">
              <div className="font-medium text-sm truncate">{team2Players[0] || 'Jugador 1'}</div>
              <div className="font-medium text-sm truncate">{team2Players[1] || 'Jugador 2'}</div>
              <div className="text-lg md:text-xl font-bold text-blue-600 mt-1">
                {scoreTeam2}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Versión desktop - Diseño original */}
      <div className="hidden md:flex justify-between items-center">
        {/* Equipo 1 */}
        <div className="text-left w-2/5 pr-2">
          <div className="font-medium text-sm truncate">{team1Players[0] || 'Jugador 1'}</div>
          <div className="font-medium text-sm truncate">{team1Players[1] || 'Jugador 2'}</div>
        </div>
        
        {/* Resultado */}
        <div className="text-center w-1/5 px-1">
          <div className="text-lg md:text-xl font-bold text-blue-600">
            {scoreTeam1} - {scoreTeam2}
          </div>
        </div>
        
        {/* Equipo 2 */}
        <div className="text-right w-2/5 pl-2">
          <div className="font-medium text-sm truncate">{team2Players[0] || 'Jugador 1'}</div>
          <div className="font-medium text-sm truncate">{team2Players[1] || 'Jugador 2'}</div>
        </div>
      </div>
    </div>
  );
};

// Componente para la vista ampliada de un partido
const MatchCardExpanded = ({ match, onClose, onEdit, onDelete, isAdmin }) => {
  const team1Players = match.team1Players || [];
  const team2Players = match.team2Players || [];
  const scoreTeam1 = match.scoreTeam1 !== '' ? match.scoreTeam1 : '?';
  const scoreTeam2 = match.scoreTeam2 !== '' ? match.scoreTeam2 : '?';
  
  // Determinar qué equipo ganó para mostrar el tilde verde
  const team1Won = match.winner && match.winner.startsWith('Equipo 1');
  const team2Won = match.winner && match.winner.startsWith('Equipo 2');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-blue-700">Detalles del Partido</h3>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>
          
          {/* Versión móvil - Diseño apilado */}
          <div className="md:hidden">
            {/* Equipo 1 */}
            <div className="mb-6">
              {/* Jugador 1 */}
              <div className="flex justify-between items-center mb-0">
                <div className="flex items-center">
                  <img 
                    src={getPlayerImage(team1Players[0])} 
                    alt={team1Players[0]} 
                    className="w-15 h-15 rounded-full object-cover mr-2"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/players/default.png";
                    }}
                  />
                  <span className="text-2xl">{team1Players[0] || 'Jugador 1'}</span>
                </div>
                <div className="w-8"></div> {/* Espacio vacío a la derecha */}
              </div>
              
              {/* Resultado */}
              <div className="flex justify-end mb-0">
                <div className="text-4xl font-bold text-blue-600">
                  {scoreTeam1}
                </div>
              </div>
              
              {/* Jugador 2 */}
              <div className="flex justify-between items-center mb-0">
                <div className="flex items-center">
                  <img 
                    src={getPlayerImage(team1Players[1])} 
                    alt={team1Players[1]} 
                    className="w-15 h-15 rounded-full object-cover mr-2"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/players/default.png";
                    }}
                  />
                  <span className="text-2xl">{team1Players[1] || 'Jugador 2'}</span>
                </div>
                <div className="w-8"></div> {/* Espacio vacío a la derecha */}
              </div>
            </div>
            
            {/* VS con líneas */}
            <div className="text-center my-4 flex items-center justify-center">
              <div className="h-px bg-gray-400 w-1/4"></div>
              <div className="text-xl font-semibold text-gray-600 mx-3">vs</div>
              <div className="h-px bg-gray-400 w-1/4"></div>
            </div>
            
            {/* Equipo 2 */}
            <div className="mt-0">
              {/* Jugador 1 */}
              <div className="flex justify-between items-center mb-0">
                <div className="flex items-center">
                  <img 
                    src={getPlayerImage(team2Players[0])} 
                    alt={team2Players[0]} 
                    className="w-15 h-15 rounded-full object-cover mr-2"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/players/default.png";
                    }}
                  />
                  <span className="text-2xl">{team2Players[0] || 'Jugador 1'}</span>
                </div>
                <div className="w-8"></div> {/* Espacio vacío a la derecha */}
              </div>
              
              {/* Resultado */}
              <div className="flex justify-end mb-0">
                <div className="text-4xl font-bold text-blue-600">
                  {scoreTeam2}
                </div>
              </div>
              
              {/* Jugador 2 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <img 
                    src={getPlayerImage(team2Players[1])} 
                    alt={team2Players[1]} 
                    className="w-15 h-15 rounded-full object-cover mr-2"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/players/default.png";
                    }}
                  />
                  <span className="text-2xl">{team2Players[1] || 'Jugador 2'}</span>
                </div>
                <div className="w-8"></div> {/* Espacio vacío a la derecha */}
              </div>
            </div>
          </div>
          
          {/* Versión desktop - Diseño lado a lado */}
          <div className="hidden md:flex flex-col items-center mb-8">
            {/* Equipo 1 */}
            <div className="flex flex-col w-full mb-6">
              {/* Jugador 1 */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <img 
                    src={getPlayerImage(team1Players[0])} 
                    alt={team1Players[0]} 
                    className="w-20 h-20 rounded-full object-cover mr-3"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/players/default.png";
                    }}
                  />
                  <span className="text-2xl">{team1Players[0] || 'Jugador 1'}</span>
                </div>
                <div className="w-12"></div> {/* Espacio vacío a la derecha */}
              </div>
              
              {/* Resultado centrado con tilde verde */}
              <div className="flex justify-center items-center mb-0">
                <div className="text-4xl font-bold text-blue-600">
                  {scoreTeam1}
                </div>
                {/* Tilde verde si el equipo 1 ganó */}
                {team1Won && (
                  <svg className="w-12 h-12 text-green-500 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
              
              {/* Jugador 2 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <img 
                    src={getPlayerImage(team1Players[1])} 
                    alt={team1Players[1]} 
                    className="w-20 h-20 rounded-full object-cover mr-3"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/players/default.png";
                    }}
                  />
                  <span className="text-2xl">{team1Players[1] || 'Jugador 2'}</span>
                </div>
                <div className="w-12"></div> {/* Espacio vacío a la derecha */}
              </div>
            </div>
            
            {/* VS con líneas */}
            <div className="text-center my-4 flex items-center justify-center">
              <div className="h-px bg-gray-400 w-1/4"></div>
              <div className="text-2xl font-semibold text-gray-600 mx-3">vs</div>
              <div className="h-px bg-gray-400 w-1/4"></div>
            </div>
            
            {/* Equipo 2 */}
            <div className="flex flex-col w-full mt-4">
              {/* Jugador 1 */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <img 
                    src={getPlayerImage(team2Players[0])} 
                    alt={team2Players[0]} 
                    className="w-20 h-20 rounded-full object-cover mr-3"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/players/default.png";
                    }}
                  />
                  <span className="text-2xl">{team2Players[0] || 'Jugador 1'}</span>
                </div>
                <div className="w-12"></div> {/* Espacio vacío a la derecha */}
              </div>
              
              {/* Resultado centrado con tilde verde */}
              <div className="flex justify-center items-center mb-3">
                <div className="text-4xl font-bold text-blue-600">
                  {scoreTeam2}
                </div>
                {/* Tilde verde si el equipo 2 ganó */}
                {team2Won && (
                  <svg className="w-12 h-12 text-green-500 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
              
              {/* Jugador 2 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <img 
                    src={getPlayerImage(team2Players[1])} 
                    alt={team2Players[1]} 
                    className="w-20 h-20 rounded-full object-cover mr-3"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/players/default.png";
                    }}
                  />
                  <span className="text-2xl">{team2Players[1] || 'Jugador 2'}</span>
                </div>
                <div className="w-12"></div> {/* Espacio vacío a la derecha */}
              </div>
            </div>
          </div>
          
          {/* Información adicional centrada */}
          <div className="text-center mt-8">
            {/* Equipo ganador en recuadro verde (solo para móvil) */}
            {match.winner && match.winner !== 'No determinado' && (
              <div className="md:hidden border-2 border-green-600 bg-green-100 bg-opacity-70 rounded-lg p-3 mb-4 inline-block">
                <p className="text-lg font-semibold text-green-800">
                  Ganador: {match.winner}
                </p>
              </div>
            )}
            
            <p className="hidden md:block text-lg md:text-xl font-semibold text-green-700 mb-2">
              Ganador: {match.winner || 'No determinado'}
            </p>
            
            <p className="text-gray-600 mb-4">
              Fecha: {match.date || 'Fecha no especificada'}
            </p>
            
            {/* Comentario del partido */}
            {match.comment && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-gray-700 italic">
                  "{match.comment}"
                </p>
              </div>
            )}
            
            {/* Historial de ediciones */}
            <div className="text-left max-w-2xl mx-auto">
              <h4 className="text-lg md:text-xl font-semibold text-blue-700 mb-3 text-center">Historial de Cambios</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Creado por:</span> {match.loadedBy || 'Desconocido'} 
                  <span className="font-normal"> el {match.timestamp ? new Date(match.timestamp.toDate()).toLocaleString() : 'N/A'}</span>
                </p>
                
                {match.editHistory && match.editHistory.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Ediciones:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {match.editHistory.map((edit, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">{edit.editedBy}</span> 
                          <span className="font-normal"> el {new Date(edit.editedTimestamp.toDate()).toLocaleString()}:</span>
                          <span className="font-normal"> {edit.changes.join(', ')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 mt-6">
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(match)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center"
                >
                  <Edit className="mr-2" size={16} /> Editar
                </button>
                <button
                  onClick={() => onDelete(match)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center"
                >
                  <Trash2 className="mr-2" size={16} /> Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Predefined list of players for match entry, sorted alphabetically
const playerList = [
 "Ale Perrone", "Alexis", "Ariel", "Bruno", "Condor", "Coreano", "Daniel", "Diego Balazo", "Elvis", 
 "Ezequiel", "Facundo", "Federico", "Fito", "Franco", "Gaby Mecanico", "German", "Guillermo", "Hector Musico", 
 "Hugo", "Ivan", "Javier", "Joni", "Julian Olivieri", "Julian Rugna", "Lautaro", "Leandro", "Lucy", "Luigi", 
 "Luis", "Marcelo", "Marcelo Zurdo", "Mariano", "Mario Arriola", "Martin", "Matias", "Maxi", "Mono", "Nacho", 
 "Nico Ciudad", "Raul", "Roberto", "Rodrigo", "Ruben", "Sergio", "Sosa", "Tano", "Tito", "Vasco", 
 "Zurdo Diaz", "Zurdo Ruben"
].sort();

// Hardcoded users for login
const users = {
  "admin": { password: "admin123", isAdmin: true },
  "usuario1": { password: "pass1", isAdmin: false },
  "usuario2": { password: "pass2", isAdmin: false }
};

// Helper function to check if a player name is in the predefined list
const isPredefinedPlayer = (playerName) => playerName && playerList.includes(playerName);

// Componente de Copyright
const CopyrightFooter = () => (  
  <footer className="mt-6 text-center text-gray-300 text-sm">
    © 2025 Bruno Canedo. Prohibida la reproducción o uso de la App sin permiso.
  </footer>
);

// ErrorBoundary component to catch rendering errors
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
 // Estados para el nuevo sistema de login
 const [currentScreen, setCurrentScreen] = useState('login'); // 'login', 'register', 'welcome', 'app', 'stats', 'noCancheroScreen'
 const [loginForm, setLoginForm] = useState({ username: '', password: '' });
 const [registerForm, setRegisterForm] = useState({
   nombre: '',
   apellido: '',
   apodo: '',
   email: '',
   club: '',
   password: '',
   repeatPassword: ''
 });
 const [loginError, setLoginError] = useState('');
 const [registerError, setRegisterError] = useState('');
 const [registerSuccess, setRegisterSuccess] = useState('');
 const [currentUser, setCurrentUser] = useState(''); // Guardamos el nombre de usuario del login
 const [isAdmin, setIsAdmin] = useState(false); // Guardamos si el usuario es administrador

 // Estados existentes
 const [matches, setMatches] = useState([]);
 const [deletedMatches, setDeletedMatches] = useState([]);
 const [fetchedDailySummaries, setFetchedDailySummaries] = useState({});
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
 const [userId, setUserId] = useState(null);
 const [loading, setLoading] = useState(true);
 const [editingMatchId, setEditingMatchId] = useState(null);
 const [editedMatch, setEditedMatch] = useState(null);
 const [showConfirmModal, setShowConfirmModal] = useState(false);
 const [matchToDelete, setMatchToDelete] = useState(null);
 const [errorMessage, setErrorMessage] = useState('');
 const [selectedDate, setSelectedDate] = useState(null);
 const [calendarDate, setCalendarDate] = useState(new Date());
 const [statsPlayerFilter, setStatsPlayerFilter] = useState('');
 const [statsDateFrom, setStatsDateFrom] = useState('');
 const [statsDateTo, setStatsDateTo] = useState('');
 const [statsYearFilter, setStatsYearFilter] = useState('');
 const [statsMonthFilter, setStatsMonthFilter] = useState('');
 const [showFullRanking, setShowFullRanking] = useState({
     played: false,
     won: false,
     lost: false,
     winPercentage: false,
 });
 const [showMatchList, setShowMatchList] = useState(false);
 const [visibleMatchesCount, setVisibleMatchesCount] = useState(10);
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
 const [confirmationMessage, setConfirmationMessage] = useState('');
 const [expandedMatch, setExpandedMatch] = useState(null);

 // Funciones para el nuevo sistema de login
 const handleLogin = (e) => {
   e.preventDefault();
   const { username, password } = loginForm;
   
   if (users[username] && users[username].password === password) {
     // Login exitoso
     setLoginError('');
     setCurrentUser(username); // Guardamos el nombre de usuario
     setIsAdmin(users[username].isAdmin || false); // Guardamos si es administrador
     setCurrentScreen('welcome');
   } else {
     setLoginError('Usuario o contraseña incorrectos');
   }
 };

const handleRegister = async (e) => {
  e.preventDefault();
  const { nombre, apellido, apodo, email, club, password, repeatPassword } = registerForm;  // Agregamos email
  
  // Validar que las contraseñas coincidan
  if (password !== repeatPassword) {
    setRegisterError('Las contraseñas no coinciden');
    return;
  }
  
  try {
    // Enviar email con EmailJS
    const templateParams = {
      nombre,
      apellido,
      apodo,
      email,  // Agregamos email
      club,
      password,
      to_email: process.env.REACT_APP_EMAIL_TO,
      date: new Date().toLocaleString()
    };
    
    await emailjs.send(
      process.env.REACT_APP_EMAILJS_SERVICE_ID,
      process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
      templateParams,
      process.env.REACT_APP_EMAILJS_USER_ID
    );
    
    setRegisterSuccess('Solicitud enviada a los administradores, en menos de 24hs se te generará un usuario y contraseña. Se responde al email indicado en la solicitud. Gracias!.');
    setRegisterForm({
      nombre: '',
      apellido: '',
      apodo: '',
      email: '',  // Agregamos email
      club: '',
      password: '',
      repeatPassword: ''
    });
    setRegisterError('');
    
    // Volver a la pantalla de login después de 3 segundos
    setTimeout(() => {
      setCurrentScreen('login');
      setRegisterSuccess('');
    }, 3000);
    
  } catch (error) {
    console.error('Error al enviar email:', error);
    setRegisterError(`Error: ${error.text || error.message || 'Error al enviar la solicitud. Inténtalo de nuevo.'}`);
  }
};

 const goToRegister = () => {
   setCurrentScreen('register');
   setLoginError('');
 };

 const goToLogin = () => {
   setCurrentScreen('login');
   setRegisterError('');
   setRegisterSuccess('');
 };

 // Función para ir a la pantalla principal (app)
const goToApp = () => {
  if (isAdmin) {
    setCurrentScreen('app');
  } else {
    setErrorMessage('No tienes permisos para acceder a esta función');
  }
};

 // Función para ir a estadísticas
 const goToStats = () => {
   setCurrentScreen('stats');
 };

 // Función para ir a partido sin canchero
 const goToNoCanchero = () => {
   setCurrentScreen('noCancheroScreen');
 };

 // Resto del código existente (sin cambios)
 useEffect(() => {
  // Deshabilitar clic derecho
  const disableRightClick = (e) => {
 e.preventDefault();
 alert('El clic derecho está deshabilitado para proteger el contenido.');
  };
  document.addEventListener('contextmenu', disableRightClick);
  // Detectar apertura de herramientas de desarrollador
  const detectDevTools = () => {
 const threshold = 160;
 const widthThreshold = window.outerWidth - window.innerWidth > threshold;
 const heightThreshold = window.outerHeight - window.innerHeight > threshold;
 if (widthThreshold || heightThreshold) {
   alert('Por favor, no uses las herramientas de desarrollador.');
   window.location.reload(); // Recarga la página si se detectan
 }
  };
  window.addEventListener('resize', detectDevTools);
  return () => {
 document.removeEventListener('contextmenu', disableRightClick);
 window.removeEventListener('resize', detectDevTools);
  };
}, []);

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
 const matchesQuery = query(matchesCollectionRef, limit(100));
 const deletedMatchesQuery = selectedDate
     ? query(
           deletedMatchesCollectionRef,
           where("originalMatch.date", "==", selectedDate),
           limit(100)
       )
     : query(deletedMatchesCollectionRef, limit(100));
 const dailySummariesQuery = selectedDate
     ? query(
           collection(db, `artifacts/${appId}/dailySummaries`),
           where("date", "==", selectedDate),
           limit(100)
       )
     : query(collection(db, `artifacts/${appId}/dailySummaries`), limit(100));
 const unsubscribeMatches = onSnapshot(matchesQuery, (matchesSnapshot) => {
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
 isDeleted: false,
 pendingConfirmation: doc.data().pendingConfirmation || false
}));
            fetchedMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
            setMatches(fetchedMatches);
            setErrorMessage('');
        }, (error) => {
            console.error("Error fetching matches:", error);
            setErrorMessage("Error al cargar los partidos. Por favor, intenta de nuevo.");
        });
        const unsubscribeDeletedMatches = onSnapshot(deletedMatchesQuery, (deletedSnapshot) => {
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
        const unsubscribeDailySummaries = onSnapshot(dailySummariesQuery, { source: "cache" }, (dailySummariesSnapshot) => {
            const fetchedDailySummaries = {};
            dailySummariesSnapshot.forEach(doc => {
                const [docDate, player] = doc.id.split('_');
                if (!fetchedDailySummaries[docDate]) {
                    fetchedDailySummaries[docDate] = {};
                }
                fetchedDailySummaries[docDate][player] = doc.data();
            });
            setFetchedDailySummaries(fetchedDailySummaries);
        }, (error) => {
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
    const allMatches = [...matches, ...deletedMatches].filter(match => !match.isDeleted);
    allMatches.forEach(match => {
        const date = match.date || new Date().toLocaleDateString('en-CA');
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
        setErrorMessage("La aplicación no está lista. Por favor, espera o recarga.");
        return;
    }
    try {
        const dailySummaryDocRef = doc(db, `artifacts/${appId}/dailySummaries`, `${date}_${player}`);
        const paymentHistoryEntry = {
            changedBy: currentUser, // Usamos el usuario actual
            action: isPaid ? 'Marcado como pagado' : 'Marcado como no pagado',
            timestamp: Timestamp.now()
        };
        await setDoc(dailySummaryDocRef, {
            date,
            player,
            paid: isPaid,
            paymentHistory: [
                ...(groupedMatches[date]?.summary[player]?.paymentHistory || []),
                paymentHistoryEntry
            ]
        }, { merge: true });
        setErrorMessage('');
    } catch (e) {
        console.error("Error updating paid status:", e);
        setErrorMessage("Error al actualizar el estado de pago. Intenta de nuevo.");
    }
};

const addMatch = async () => {
    if (!userId) {
        setErrorMessage("La aplicación no está lista. Por favor, espera o recarga.");
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
            setErrorMessage("La puntuación del Equipo 1 debe ser un número válido y no negativo.");
            return;
        }
    }
    if (score2 !== '') {
        score2 = parseInt(score2);
        if (isNaN(score2) || score2 < 0) {
            setErrorMessage("La puntuación del Equipo 2 debe ser un número válido y no negativo.");
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
loadedBy: currentUser, // Usamos el usuario actual
timestamp: Timestamp.now(),
editHistory: [],
isDeleted: false,
pendingConfirmation: false});
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
        } catch (e) {
            console.error("Error adding document: ", e);
            setErrorMessage("Error al guardar el partido. Intenta de nuevo.");
        }
    };

    const confirmDeleteMatch = (match) => {
    setMatchToDelete(match);
    setShowConfirmModal(true);
 setExpandedMatch(null);
};

    const deleteMatch = async () => {
        if (!userId || !matchToDelete) return;
        try {
            await addDoc(collection(db, `artifacts/${appId}/deletedMatches`), {
                originalMatch: {
                    ...matchToDelete,
                    isDeleted: true
                },
                deletedBy: currentUser, // Usamos el usuario actual
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
        setErrorMessage("La aplicación no está lista. Por favor, espera o recarga.");
        return;
    }
    
    // Preparamos el objeto editedMatch con todos los datos del partido
    const transformedEditedMatch = {
        ...match,
        team1Player1: { value: match.team1Players[0] || '', isCustom: !isPredefinedPlayer(match.team1Players[0]) },
        team1Player2: { value: match.team1Players[1] || '', isCustom: !isPredefinedPlayer(match.team1Players[1]) },
        team2Player1: { value: match.team2Players[0] || '', isCustom: !isPredefinedPlayer(match.team2Players[0]) },
        team2Player2: { value: match.team2Players[1] || '', isCustom: !isPredefinedPlayer(match.team2Players[1]) },
        comment: match.comment || '',
        date: match.date || new Date().toLocaleDateString('en-CA'),
        scoreTeam1: match.scoreTeam1 !== '' ? match.scoreTeam1 : '',
        scoreTeam2: match.scoreTeam2 !== '' ? match.scoreTeam2 : '',
    };
    
    setEditingMatchId(match.id);
    setEditedMatch(transformedEditedMatch);
    setExpandedMatch(null); // Cerrar vista ampliada
    setCurrentScreen('app'); // Ir a la pantalla de añadir partido
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
                setErrorMessage("La puntuación del Equipo 1 debe ser un número válido y no negativo.");
                return;
            }
        }
        if (score2 !== '') {
            score2 = parseInt(score2);
            if (isNaN(score2) || score2 < 0) {
                setErrorMessage("La puntuación del Equipo 2 debe ser un número válido y no negativo.");
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
                changes.push(`Puntuación Equipo 1 cambiada de ${originalMatch.scoreTeam1 || 'N/A'} a ${score1 || 'N/A'}`);
            }
            if (originalMatch.scoreTeam2 !== score2) {
                changes.push(`Puntuación Equipo 2 cambiada de ${originalMatch.scoreTeam2 || 'N/A'} a ${score2 || 'N/A'}`);
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
                editedBy: currentUser, // Usamos el usuario actual
                editedTimestamp: Timestamp.now(),
                changes: changes.length > 0 ? changes : ['Edición menor']
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
            "Número",
            "Fecha",
            "Equipo 1 - Jugador 1",
            "Equipo 1 - Jugador 1 Pagó?",
            "Equipo 1 - Jugador 2",
            "Equipo 1 - Jugador 2 Pagó?",
            "Equipo 2 - Jugador 1",
            "Equipo 2 - Jugador 1 Pagó?",
            "Equipo 2 - Jugador 2",
            "Equipo 2 - Jugador 2 Pagó?",
            "Equipo 1 Puntuación",
            "Equipo 2 Puntuación",
            "Equipo 1 - Ganó?",
            "Equipo 2 - Ganó?",
            "Comentario",
            "Cargado por",
            "Estado",
            "Eliminado por",
            "Fecha de Eliminación",
            "Historial de Ediciones",
            "Historial de Pagos"
        ];
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
            const editHistoryString = (match.editHistory || [])
                .map(edit => `${edit.editedBy} (${new Date(edit.editedTimestamp.toDate()).toLocaleString()}): ${edit.changes.join(', ')}`)
                .join('; ');
            const paymentHistoryString = [
                ...(groupedMatches[match.date]?.summary[match.team1Players[0]]?.paymentHistory || []),
                ...(groupedMatches[match.date]?.summary[match.team1Players[1]]?.paymentHistory || []),
                ...(groupedMatches[match.date]?.summary[match.team2Players[0]]?.paymentHistory || []),
                ...(groupedMatches[match.date]?.summary[match.team2Players[1]]?.paymentHistory || [])
            ]
                .map(entry => `${entry.changedBy} (${new Date(entry.timestamp.toDate()).toLocaleString()}): ${entry.action}`)
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
                editHistoryString,
                paymentHistoryString
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

    const filteredMatches = matches.filter(match => {
    if (!match || !match.date || !match.team1Players || !match.team2Players || match.isDeleted) return false;
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
        // Calcular porcentaje de victorias
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
    const diff = parseFloat(b.winPercentage) - parseFloat(a.winPercentage);
    if (diff === 0) {
      return b.played - a.played; // desempata por partidos jugados
    }
    return diff;
  });    return { playedRanking, wonRanking, lostRanking, winPercentageRanking };
}, [statsSummary]);

const availableYears = useMemo(() => {
    const years = new Set();
    matches.forEach(match => {
        if (match.date) {
            years.add(match.date.split('-')[0]);
        }
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

const handleCalendarChange = (date) => {
    setCalendarDate(date);
    setSelectedDate(date.toISOString().split('T')[0]);
};

const renderLogos = () => (
    <div className="flex justify-center items-center mb-6 space-x-4">
        <img src="/images/logo1.png" alt="Logo 1" className="h-48 object-contain" />
        <img src="/images/logo2.png" alt="Logo 2" className="h-48 object-contain" />
    </div>
);

if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-600 text-white font-inter relative watermark-dsl">
            <p>Cargando aplicación...</p>
        </div>
    );
}

const renderPlayerInput = (player, setPlayerState, fieldName, isEditing = false) => {
  return (
    <div className="mb-2">
      <select
        value={player.value}
        onChange={(e) => {
          const value = e.target.value;
          const isCustom = value === 'Otro';
          setPlayerState(prev => ({
            ...prev,
            [fieldName]: { value: isCustom ? '' : value, isCustom }
          }));
        }}
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      >
        <option value="">Selecciona un jugador</option>
        {playerList.map((p, index) => (
          <option key={index} value={p}>{p}</option>
        ))}
        <option value="Otro">Otro</option>
      </select>
      {player.isCustom && (
        <input
          type="text"
          value={player.value}
          onChange={(e) => {
            setPlayerState(prev => ({
              ...prev,
              [fieldName]: { ...prev[fieldName], value: e.target.value }
            }));
          }}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-2"
          placeholder="Escribe el nombre del jugador"
        />
      )}
      
      {/* Vista previa del jugador seleccionado con imagen */}
      {player.value && !player.isCustom && (
        <div className="flex items-center mt-2 p-2 bg-gray-50 rounded">
          <img 
            src={getPlayerImage(player.value)} 
            alt={player.value} 
            className="w-8 h-8 rounded-full object-cover mr-2"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/images/players/default.png";
            }}
          />
          <span className="text-sm font-medium">{player.value}</span>
        </div>
      )}
    </div>
  );
};

// Nueva pantalla de login
if (currentScreen === 'login') {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-blue-900 to-blue-600 p-4 font-inter text-gray-800 relative watermark-dsl">
        <div className="flex-grow flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
            {renderLogos()}
            <h2 className="text-2xl font-semibold text-blue-700 mb-8">Iniciar Sesión</h2>
            {loginError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {loginError}</span>
              </div>
            )}
            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <label className="block text-gray-700 text-lg font-bold mb-3" htmlFor="username">
                  Usuario
                </label>
                <input
                  type="text"
                  id="username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                  placeholder="Usuario"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-lg font-bold mb-3" htmlFor="password">
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-lg"
                  placeholder="Contraseña"
                  required
                />
              </div>
              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                >
                  <LogIn className="mr-3" size={24} /> Ingresar
                </button>
                <button
                  type="button"
                  onClick={goToRegister}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                >
                  <UserPlus className="mr-3" size={24} /> Solicitar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
        <CopyrightFooter />
      </div>
    </ErrorBoundary>
  );
}

// Nueva pantalla de registro
if (currentScreen === 'register') {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-blue-900 to-blue-600 p-4 font-inter text-gray-800 relative watermark-dsl">
        <div className="flex-grow flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
            {renderLogos()}
            <h2 className="text-2xl font-semibold text-blue-700 mb-8">Solicitar Registro</h2>
            {registerError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {registerError}</span>
              </div>
            )}
            {registerSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Éxito:</strong>
                <span className="block sm:inline"> {registerSuccess}</span>
              </div>
            )}
            <form onSubmit={handleRegister}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nombre">
                  Nombre
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={registerForm.nombre}
                  onChange={(e) => setRegisterForm({ ...registerForm, nombre: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="apellido">
                  Apellido
                </label>
                <input
                  type="text"
                  id="apellido"
                  value={registerForm.apellido}
                  onChange={(e) => setRegisterForm({ ...registerForm, apellido: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="apodo">
                  Apodo
                </label>
                <input
                  type="text"
                  id="apodo"
                  value={registerForm.apodo}
                  onChange={(e) => setRegisterForm({ ...registerForm, apodo: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              {/* Nuevo campo: Email */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              
              {/* Campo Club modificado a select */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="club">
                  Club
                </label>
                <select
                  id="club"
                  value={registerForm.club}
                  onChange={(e) => setRegisterForm({ ...registerForm, club: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">Selecciona un club</option>
                  <option value="Defensores de Santos Lugares">Defensores de Santos Lugares</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="repeatPassword">
                  Repetir Contraseña
                </label>
                <input
                  type="password"
                  id="repeatPassword"
                  value={registerForm.repeatPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, repeatPassword: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105"
                >
                  Enviar Solicitud
                </button>
                <button
                  type="button"
                  onClick={goToLogin}
                  className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105"
                >
                  <ArrowLeft className="mr-2" size={18} /> Volver
                </button>
              </div>
            </form>
          </div>
        </div>
        <CopyrightFooter />
      </div>
    </ErrorBoundary>
  );
}

if (currentScreen === 'noCancheroScreen') {
    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 p-4 font-inter text-gray-800 flex flex-col items-center relative watermark-dsl">
                {renderLogos()}
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl mb-8">
                    <h1 className="text-4xl font-bold text-center text-blue-700 mb-6">Cargar Partido sin Canchero</h1>
                    {confirmationMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <strong className="font-bold">Éxito:</strong>
                            <span className="block sm:inline"> {confirmationMessage}</span>
                        </div>
                    )}
                    {errorMessage && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <strong className="font-bold">Error:</strong>
                            <span className="block sm:inline"> {errorMessage}</span>
                        </div>
                    )}
                    <div className="flex justify-end mb-4">
                        <button
    onClick={() => {
        setCurrentScreen('welcome');
    }}
    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105">
<LogOut className="mr-2" size={20} /> Volver</button>
                    </div>
                    <div className="mb-8 p-4 border border-blue-200 rounded-lg bg-blue-50">
                        <h2 className="text-2xl font-semibold text-blue-700 mb-4">Registrar Partido</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">Equipo 1:</label>
        {renderPlayerInput(noCancheroMatch.team1Player1, setNoCancheroMatch, 'team1Player1')}
        {renderPlayerInput(noCancheroMatch.team1Player2, setNoCancheroMatch, 'team1Player2')}
    </div>
    <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">Equipo 2:</label>
        {renderPlayerInput(noCancheroMatch.team2Player1, setNoCancheroMatch, 'team2Player1')}
        {renderPlayerInput(noCancheroMatch.team2Player2, setNoCancheroMatch, 'team2Player2')}
    </div>
</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Puntuación Equipo 1:</label>
                                <input
                                    type="number"
                                    name="scoreTeam1"
                                    value={noCancheroMatch.scoreTeam1}
                                    onChange={(e) => setNoCancheroMatch({ ...noCancheroMatch, scoreTeam1: e.target.value })}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Puntuación Equipo 2:</label>
                                <input
                                    type="number"
                                    name="scoreTeam2"
                                    value={noCancheroMatch.scoreTeam2}
                                    onChange={(e) => setNoCancheroMatch({ ...noCancheroMatch, scoreTeam2: e.target.value })}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Fecha:</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={noCancheroMatch.date}
                                    onChange={(e) => setNoCancheroMatch({ ...noCancheroMatch, date: e.target.value })}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">¿Quién Carga?:</label>
                            <input
                                type="text"
                                name="loadedBy"
                                value={noCancheroMatch.loadedBy}
                                onChange={(e) => setNoCancheroMatch({ ...noCancheroMatch, loadedBy: e.target.value })}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Escribe quién carga el partido"
                            />
                        </div>
                        <button
                            onClick={async () => {
                                if (!userId) {
                                    setErrorMessage("La aplicación no está lista. Por favor, espera o recarga.");
                                    return;
                                }
                                const team1Players = [noCancheroMatch.team1Player1.value, noCancheroMatch.team1Player2.value].filter(p => p);
                                const team2Players = [noCancheroMatch.team2Player1.value, noCancheroMatch.team2Player2.value].filter(p => p);
                                const { date, loadedBy, scoreTeam1, scoreTeam2 } = noCancheroMatch;
                                if (team1Players.length !== 2 || team2Players.length !== 2 || !date || !scoreTeam1 || !scoreTeam2 || !loadedBy) {
                                    setErrorMessage("Por favor, completa todos los campos obligatorios.");
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
                                const score1 = parseInt(scoreTeam1);
                                const score2 = parseInt(scoreTeam2);
                                if (isNaN(score1) || score1 < 0 || isNaN(score2) || score2 < 0) {
                                    setErrorMessage("Las puntuaciones deben ser números válidos y no negativos.");
                                    return;
                                }
                                let winner = 'Empate';
                                if (score1 > score2) {
                                    winner = `Equipo 1 (${team1Players.join(' y ')})`;
                                } else if (score2 > score1) {
                                    winner = `Equipo 2 (${team2Players.join(' y ')})`;
                                }
                                try {
                                    await addDoc(collection(db, `artifacts/${appId}/matches`), {
                                        team1Players,
                                        team2Players,
                                        scoreTeam1: score1,
                                        scoreTeam2: score2,
                                        date,
                                        comment: '',
                                        winner,
                                        loadedBy,
                                        timestamp: Timestamp.now(),
                                        editHistory: [],
                                        isDeleted: false,
                                        pendingConfirmation: true
                                    });
                                    setConfirmationMessage('Partido cargado a confirmar por un admin.');
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
                                    setTimeout(() => setConfirmationMessage(''), 5000);
                                } catch (e) {
                                    console.error("Error adding document: ", e);
                                    setErrorMessage("Error al guardar el partido. Intenta de nuevo.");
                                }
                            }}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105"
                        >
                            <PlusCircle className="mr-2" size={20} /> Agregar Partido
                        </button>
                    </div>
                </div>
                <CopyrightFooter />
            </div>
        </ErrorBoundary>
    );
}

    if (currentScreen === 'stats') {
        return (
            <ErrorBoundary>
                <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 p-4 font-inter text-gray-800 flex flex-col items-center relative watermark-dsl">
                    {renderLogos()}
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl mb-8">
                        <h1 className="text-4xl font-bold text-center text-blue-700 mb-6">Estadísticas de Partidos</h1>
                        <div className="flex justify-between mb-4">
                            <button
                                onClick={() => setCurrentScreen('welcome')}
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
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
    
    {/* Vista previa del jugador seleccionado con imagen */}
    {statsPlayerFilter && (
        <div className="flex items-center mt-2 p-2 bg-gray-50 rounded">
            <img 
                src={getPlayerImage(statsPlayerFilter)} 
                alt={statsPlayerFilter} 
                className="w-8 h-8 rounded-full object-cover mr-2"
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/players/default.png";
                }}
            />
            <span className="text-sm font-medium">{statsPlayerFilter}</span>
        </div>
    )}
</div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Año:</label>
                                            <select
                                                value={statsYearFilter}
                                                onChange={(e) => setStatsYearFilter(e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            >
                                                <option value="">Todos los años</option>
                                                {availableYears.map((year, index) => (
                                                    <option key={index} value={year}>
                                                        {year}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 text-sm font-bold mb-2">Mes:</label>
                                            <select
                                                value={statsMonthFilter}
                                                onChange={(e) => setStatsMonthFilter(e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            >
                                                <option value="">Todos los meses</option>
                                                <option value="1">Enero</option>
                                                <option value="2">Febrero</option>
                                                <option value="3">Marzo</option>
                                                <option value="4">Abril</option>
                                                <option value="5">Mayo</option>
                                                <option value="6">Junio</option>
                                                <option value="7">Julio</option>
                                                <option value="8">Agosto</option>
                                                <option value="9">Septiembre</option>
                                                <option value="10">Octubre</option>
                                                <option value="11">Noviembre</option>
                                                <option value="12">Diciembre</option>
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
                                <h2 className="text-2xl font-semibold text-blue-700 mb-4">Resumen de Estadísticas</h2>
                                {statsPlayerFilter && statsSummary[statsPlayerFilter] ? (
                                    <div className="bg-blue-100 p-3 rounded-lg shadow-sm border border-blue-200 mb-6">
                                        <p className="font-bold text-blue-800">{statsPlayerFilter}</p>
                                        <p className="text-gray-700">Jugados: {statsSummary[statsPlayerFilter].played}</p>
                                        <p className="text-green-700">Ganados: {statsSummary[statsPlayerFilter].won}</p>
                                        <p className="text-red-700">Perdidos: {statsSummary[statsPlayerFilter].lost}</p>
                                        <p className="text-blue-700">Porcentaje de Victorias: {statsSummary[statsPlayerFilter].winPercentage}%</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500">Selecciona un jugador para ver su resumen.</p>
                                )}
                                <h2 className="text-2xl font-semibold text-blue-700 mb-4">Rankings</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
                                                        <span>
  {key === 'winPercentage'
    ? `${entry.winPercentage}% (${entry.played})`
    : `${entry[key]}${suffix || ''}`
  }
</span>
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
                                <h2 className="text-2xl font-semibold text-blue-700 mb-4">Lista de Partidos</h2>
{!showMatchList ? (
    <button
        onClick={() => setShowMatchList(true)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105"
    >
        Mostrar Lista de Partidos
    </button>
) : (
    <>
        {filteredMatches.length === 0 ? (
            <p className="text-gray-500">No hay partidos para los filtros seleccionados.</p>
        ) : (
            <div className="grid grid-cols-1 gap-3">
                {filteredMatches.slice(0, visibleMatchesCount).map((match, index) => (
                    <div key={match.id}>
                        {/* Vista reducida del partido */}
                        <MatchCardReduced 
                            match={match} 
                            onClick={() => setExpandedMatch(match)} 
                        />
                    </div>
                ))}
            </div>
        )}
        {filteredMatches.length > visibleMatchesCount && (
            <button
                onClick={() => setVisibleMatchesCount(prev => prev + 10)}
                className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105"
            >
                Cargar Más
            </button>
        )}
    </>
)}

{/* Vista ampliada del partido seleccionado */}
{expandedMatch && (
    <MatchCardExpanded 
        match={expandedMatch}
        onClose={() => setExpandedMatch(null)}
        onEdit={null}  // No permitimos editar en estadísticas
        onDelete={null} // No permitimos eliminar en estadísticas
        isAdmin={false} // No mostramos botones en estadísticas
    />
)}
                            </>
                        )}
                    </div>
<CopyrightFooter />
                </div>
            </ErrorBoundary>
        );
    }

// Pantalla de bienvenida (después del login)
if (currentScreen === 'welcome') {
    return (
        <ErrorBoundary>
            <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-blue-900 to-blue-600 p-4 font-inter text-gray-800 relative watermark-dsl">
                <div className="flex-grow flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
                        {renderLogos()}
                        <h2 className="text-2xl font-semibold text-blue-700 mb-8">Bienvenido, {currentUser}</h2>
                        <div className="flex flex-col space-y-4">
                            {/* Solo mostrar para administradores */}
                            {isAdmin && (
                                <button
                                    onClick={goToApp}
                                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                                >
                                    <PlusCircle className="mr-3" size={24} /> Añadir Partido
                                </button>
                            )}
                            <button
                                onClick={goToStats}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                            >
                                <BarChart2 className="mr-3" size={24} /> Estadísticas
                            </button>
                            <button
                                onClick={goToNoCanchero}
                                className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
                            >
                                <PlusCircle className="mr-3" size={24} /> Partido sin Canchero
                            </button>
                            <button
    onClick={() => {
        setCurrentScreen('login');
        window.location.reload(); // Agregar esta línea
    }}
    className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center justify-center w-full transform transition-transform duration-200 hover:scale-105 text-xl"
>
    <LogOut className="mr-3" size={24} /> Cerrar Sesión
</button>
                        </div>
                    </div>
                </div>
                <CopyrightFooter />
            </div>
        </ErrorBoundary>
    );
}

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 p-4 font-inter text-gray-800 flex flex-col items-center relative watermark-dsl">
                {renderLogos()}
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl mb-8">
                    <h1 className="text-4xl font-bold text-center text-blue-700 mb-6">Control de Partidos de Pelota Paleta</h1>
                {/* Mensaje para no administradores */}
                {!isAdmin && (
                    <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
                        <p className="text-center">
                            <strong>Modo de solo lectura:</strong> No tienes permisos para añadir partidos. 
                            Contacta a un administrador si necesitas registrar nuevos partidos.
                        </p>
                    </div>
                )}
                    {userId && (
                        <p className="text-sm text-center text-gray-500 mb-4">
                            ID de Usuario (Anónimo): <span className="font-mono bg-gray-100 p-1 rounded">{userId}</span>
                        </p>
                    )}
                    {currentUser && (
                        <p className="text-sm text-center text-gray-500 mb-4">
                            Usuario: <span className="font-mono bg-gray-100 p-1 rounded">{currentUser}</span>
                            {isAdmin && <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">ADMIN</span>}
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
                            onClick={() => setCurrentScreen('welcome')}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                        >
                            <LogOut className="mr-2" size={20} /> Volver
                        </button>
                    </div>

                {/* Solo mostrar formulario para administradores */}
                {isAdmin && (
                    <div className="mb-8 p-4 border border-blue-200 rounded-lg bg-blue-50">
    {editingMatchId ? (
        // Formulario de edición
        <>
            <h2 className="text-2xl font-semibold text-blue-700 mb-4">Editar Partido</h2>
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
                    <label className="block text-gray-700 text-sm font-bold mb-2">Puntuación Equipo 1:</label>
                    <input
                        type="number"
                        name="scoreTeam1"
                        value={editedMatch.scoreTeam1}
                        onChange={handleEditedMatchOtherInputChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Puntuación Equipo 2:</label>
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
                <label className="block text-gray-700 text-sm font-bold mb-2">Comentario:</label>
                <textarea
                    name="comment"
                    value={editedMatch.comment}
                    onChange={handleEditedMatchOtherInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Escribe un comentario sobre el partido"
                />
            </div>
            <div className="flex justify-end space-x-3">
                <button
                    onClick={saveEditedMatch}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                >
                    <Save className="mr-2" size={16} /> Guardar Cambios
                </button>
                <button
                    onClick={cancelEditing}
                    className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline flex items-center transform transition-transform duration-200 hover:scale-105"
                >
                    <XCircle className="mr-2" size={16} /> Cancelar
                </button>
            </div>
        </>
    ) : (
        // Formulario de nuevo partido
        <>
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
                    <label className="block text-gray-700 text-sm font-bold mb-2">Puntuación Equipo 1 (Opcional):</label>
                    <input
                        type="number"
                        name="scoreTeam1"
                        value={newMatch.scoreTeam1}
                        onChange={handleNewMatchOtherInputChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Puntuación Equipo 2 (Opcional):</label>
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
        </>
    )}
</div>
                    )}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-blue-700">Resumen de Partidos por Fecha</h2>
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
                            tileClassName={({ date, view }) => {
    if (view !== 'month') return null;
    const dateStr = date.toISOString().split('T')[0];
    const matchesForDate = groupedMatches[dateStr]?.matches || [];
    const hasPending = matchesForDate.some(match => match.pendingConfirmation && !match.isDeleted);
    const hasMatches = matchesForDate.length > 0;
    if (hasPending) return 'has-pending-matches';
    return hasMatches ? 'has-matches' : null;
}}
                            className="w-full border border-gray-200 rounded-lg shadow-sm bg-white p-4"
                        />
                    </div>
                    {selectedDate && groupedMatches[selectedDate] ? (
                        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl mb-8 border border-blue-200">
                            <h3 className="text-3xl font-bold text-blue-800 mb-4">Fecha: {selectedDate} ({groupedMatches[selectedDate].matches.length} partidos)</h3>
                            <h4 className="text-xl font-semibold text-blue-700 mb-3">Partidos del Día:</h4>
                            <div className="grid grid-cols-1 gap-3 mb-6">
  {groupedMatches[selectedDate].matches.map((match) => (
    <div key={match.id}>
      {/* Vista reducida del partido */}
      <MatchCardReduced 
        match={match} 
        onClick={() => setExpandedMatch(match)} 
      />
    </div>
  ))}
</div>

{/* Vista ampliada del partido seleccionado */}
{expandedMatch && (
  <MatchCardExpanded 
    match={expandedMatch}
    onClose={() => setExpandedMatch(null)}
    onEdit={startEditing}
    onDelete={confirmDeleteMatch}
    isAdmin={isAdmin}
  />
)}
 {/* Modal de confirmación va aquí */}
    {showConfirmModal && (
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6 border-2 border-red-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar Eliminación</h3>
            <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres eliminar el partido
                {(matchToDelete.team1Players || []).join(' y ') || 'N/A'} vs {(matchToDelete.team2Players || []).join(' y ') || 'N/A'}?
            </p>
            <div className="flex justify-center space-x-4">
                <button
                    onClick={deleteMatch}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transform transition-transform duration-200 hover:scale-105"
                >
                    Eliminar
                </button>
                <button
                    onClick={() => setShowConfirmModal(false)}
                    className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transform transition-transform duration-200 hover:scale-105"
                >
                    Cancelar
                </button>
            </div>
        </div>
    )}
                            <h4 className="text-xl font-semibold text-blue-700 mb-3">Resumen de Jugadores:</h4>
                            {Object.keys(groupedMatches[selectedDate].summary).length === 0 ? (
                                <p className="text-gray-500">No hay datos de resumen para esta fecha.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(groupedMatches[selectedDate].summary).map(([player, stats]) => (
  <div key={player} className="bg-blue-100 p-3 rounded-lg shadow-sm border border-blue-200">
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center">
        <img 
          src={getPlayerImage(player)} 
          alt={player} 
          className="w-10 h-10 rounded-full object-cover mr-3"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/images/players/default.png";
          }}
        />
        <div>
          <p className="font-bold text-blue-800">{player}</p>
          <p className="text-gray-700">Jugados: {stats.played}</p>
          <p className="text-green-700">Ganados: {stats.won}</p>
          <p className="text-red-700">Perdidos: {stats.lost}</p>
        </div>
      </div>
      <div className="flex items-center">
        <label htmlFor={`paid-${selectedDate}-${player}`} className="mr-2 text-gray-700">Pagó:</label>
        <input
          type="checkbox"
          id={`paid-${selectedDate}-${player}`}
          checked={stats.paid || false}
          onChange={(e) => handlePaidChange(selectedDate, player, e.target.checked)}
          className="form-checkbox h-5 w-5 text-green-600 rounded focus:ring-green-500"
        />
      </div>
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
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">Selecciona una fecha en el calendario para ver los partidos.</p>
                    )}
                </div>
                {showConfirmModal && (
    <div className="bg-white rounded-lg shadow-xl p-6 mb-6 border-2 border-red-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar Eliminación</h3>
        <p className="text-gray-600 mb-6">
            ¿Estás seguro de que quieres eliminar el partido
            {(matchToDelete.team1Players || []).join(' y ') || 'N/A'} vs {(matchToDelete.team2Players || []).join(' y ') || 'N/A'}?
        </p>
        <div className="flex justify-center space-x-4">
            <button
                onClick={deleteMatch}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transform transition-transform duration-200 hover:scale-105"
            >
                Eliminar
            </button>
            <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transform transition-transform duration-200 hover:scale-105"
            >
                Cancelar
            </button>
        </div>
    </div>
)}
<CopyrightFooter />
            </div>
        </ErrorBoundary>
    );
}

export default App;