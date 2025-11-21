import React, { useState, useEffect, useMemo } from 'react';
import { StorageService, isFirebaseConfigured } from './services/storage';
import { Room, LogEntry, UserRole, INITIAL_MATERIALS } from './types';
import { RoomCard } from './components/RoomCard';
import { LogsTable } from './components/LogsTable';
import { 
  LayoutDashboard, 
  Warehouse, 
  Search, 
  PlusCircle, 
  UserCircle,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<UserRole>(UserRole.ADMIN);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [configError, setConfigError] = useState(false);

  // Initial Data Load & Real-time Subscription
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setConfigError(true);
      return;
    }

    // Initialize DB (Creates 15 rooms if empty)
    StorageService.initializeDB();

    // Subscribe to Rooms
    const unsubRooms = StorageService.subscribeRooms((data) => {
      setRooms(data);
    });

    // Subscribe to Logs
    const unsubLogs = StorageService.subscribeLogs((data) => {
      setLogs(data);
    });

    return () => {
      unsubRooms();
      unsubLogs();
    };
  }, []);

  // Helper: Add Log (Async wrapper)
  const addLog = async (action: string, roomName: string, details: string) => {
    await StorageService.addLog({
      timestamp: Date.now(),
      userRole: currentUser,
      roomName,
      action,
      details
    });
  };

  // Action: Add Room (Fixed & Connected to DB)
  const handleAddRoom = async () => {
    const name = prompt("أدخل اسم الغرفة الجديدة:");
    if (!name) return;
    
    try {
      await StorageService.addRoom(name);
      addLog("إضافة غرفة", name, "تم إنشاء غرفة جديدة");
    } catch (error) {
      console.error("Error adding room:", error);
      alert("حدث خطأ أثناء إضافة الغرفة");
    }
  };

  // Action: Update Temp
  const handleUpdateTemp = async (id: string, temp: number) => {
    const room = rooms.find(r => r.id === id);
    if (!room) return;
    
    await StorageService.updateRoomFields(id, { temperature: temp });
    addLog("تعديل حرارة", room.name, `من ${room.temperature}° إلى ${temp}°`);
  };

  // Action: Update Stock
  const handleUpdateStock = async (id: string, material: string, amount: number) => {
    const room = rooms.find(r => r.id === id);
    if (!room) return;

    const oldQty = room.inventory[material] || 0;
    const newQty = oldQty + amount;
    
    await StorageService.updateStock(id, material, newQty);
    
    const actionType = amount > 0 ? "إدخال مخزون" : "إخراج مخزون";
    addLog(actionType, room.name, `${material}: ${oldQty} -> ${newQty}`);
  };

  // Action: Toggle Fermentation
  const handleToggleFermentation = async (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (!room) return;

    const isStarting = !room.fermentationStart;
    await StorageService.updateRoomFields(id, { 
      fermentationStart: isStarting ? Date.now() : null 
    });
    
    const action = isStarting ? "بدء تخمير" : "إيقاف تخمير";
    addLog(action, room.name, isStarting ? "بدأت العملية" : "تم إيقاف العملية");
  };

  // Computed: All Materials used for Autocomplete
  const allMaterials = useMemo(() => {
    const used = new Set<string>();
    rooms.forEach(r => Object.keys(r.inventory).forEach(k => used.add(k)));
    INITIAL_MATERIALS.forEach(m => used.add(m));
    return Array.from(used);
  }, [rooms]);

  // Computed: Filtered Rooms
  const filteredRooms = useMemo(() => {
    if (!searchQuery) return rooms;
    const lowerQ = searchQuery.toLowerCase();
    return rooms.filter(r => 
      r.name.toLowerCase().includes(lowerQ) || 
      Object.keys(r.inventory).some(k => k.toLowerCase().includes(lowerQ))
    );
  }, [rooms, searchQuery]);

  // Computed: Stats
  const stats = {
    totalRooms: rooms.length,
    activeFermentation: rooms.filter(r => r.fermentationStart !== null).length,
    totalItems: rooms.reduce((acc, r) => acc + Object.keys(r.inventory).length, 0)
  };

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg text-center border-t-4 border-red-500">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">إعدادات Firebase مفقودة</h2>
          <p className="text-slate-600 mb-6">
            للبدء، يرجى فتح ملف <code className="bg-slate-100 px-2 py-1 rounded text-red-600 font-mono dir-ltr">services/storage.ts</code> 
            وإضافة إعدادات مشروع Firebase الخاص بك في المتغير 
            <code className="bg-slate-100 px-2 py-1 rounded text-slate-800 font-mono dir-ltr mx-1">firebaseConfig</code>.
          </p>
          <div className="bg-slate-100 p-4 rounded text-left text-xs font-mono text-slate-500 overflow-x-auto dir-ltr">
            const firebaseConfig = &#123;<br/>
            &nbsp;&nbsp;apiKey: "AIzaSy...",<br/>
            &nbsp;&nbsp;authDomain: "...",<br/>
            &nbsp;&nbsp;projectId: "...",<br/>
            &nbsp;&nbsp;...<br/>
            &#125;;
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 font-sans">
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-200">
                <Warehouse className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">نظام إدارة المخازن</h1>
                <p className="text-xs text-slate-500">نسخة Firebase Serverless</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-lg">
               {Object.values(UserRole).map((role) => (
                 <button
                   key={role}
                   onClick={() => setCurrentUser(role)}
                   className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                     currentUser === role ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                   }`}
                 >
                   {role}
                 </button>
               ))}
               <div className="flex items-center gap-1 px-2 text-xs text-slate-400 border-r border-slate-300">
                  <UserCircle className="w-4 h-4" />
                  <span>محاكاة</span>
               </div>
            </div>
          </div>

          {/* Dashboard Stats Bar */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
               <div className="bg-blue-200 p-2 rounded-full text-blue-700"><Warehouse className="w-4 h-4" /></div>
               <div>
                 <p className="text-xs text-slate-500">إجمالي الغرف</p>
                 <p className="text-lg font-bold text-blue-700">{stats.totalRooms}</p>
               </div>
            </div>
            <div className="flex-1 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-center gap-3">
               <div className="bg-amber-200 p-2 rounded-full text-amber-700"><TrendingUp className="w-4 h-4" /></div>
               <div>
                 <p className="text-xs text-slate-500">تحت التخمير</p>
                 <p className="text-lg font-bold text-amber-700">{stats.activeFermentation}</p>
               </div>
            </div>
            <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-3">
               <div className="bg-emerald-200 p-2 rounded-full text-emerald-700"><LayoutDashboard className="w-4 h-4" /></div>
               <div>
                 <p className="text-xs text-slate-500">أنواع المواد</p>
                 <p className="text-lg font-bold text-emerald-700">{stats.totalItems}</p>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-200 mb-8">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            لوحة التحكم والغرف
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            سجلات النظام
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="animate-in fade-in duration-300">
            {/* Controls: Search & Add */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="بحث عن غرفة أو مادة..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              
              {currentUser === UserRole.ADMIN && (
                <button 
                  onClick={handleAddRoom}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
                >
                  <PlusCircle className="w-5 h-5" /> إضافة غرفة
                </button>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map(room => (
                <RoomCard 
                  key={room.id} 
                  room={room} 
                  userRole={currentUser}
                  onUpdateTemp={handleUpdateTemp}
                  onUpdateStock={handleUpdateStock}
                  onToggleFermentation={handleToggleFermentation}
                  allMaterials={allMaterials}
                />
              ))}
              
              {filteredRooms.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <div className="inline-block p-4 bg-slate-100 rounded-full mb-3">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-600">لم يتم العثور على نتائج</h3>
                  <p className="text-slate-400">حاول البحث بكلمات مختلفة</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <LogsTable logs={logs} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-400">
          <p>© 2023 نظام إدارة المخازن. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;