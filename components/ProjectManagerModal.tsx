import React, { useState } from 'react';
import { useStore } from '../store';
import { X, Plus, Trash2, Pin, PinOff, Edit2, Check } from 'lucide-react';
import { Project } from '../types';

const COLORS = ['#f0b429', '#4ea1ff', '#35d07f', '#ff5c5c', '#6ea8ff', '#d63384', '#6f42c1', '#fd7e14'];

export const ProjectManagerModal: React.FC = () => {
    const { showProjectManager, toggleProjectManager, projects, createProject, renameProject, deleteProject, togglePinProject } = useStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectColor, setNewProjectColor] = useState(COLORS[0]);

    if (!showProjectManager) return null;

    const startEditing = (p: Project) => {
        setEditingId(p.id);
        setEditName(p.name);
        setEditColor(p.color || COLORS[0]);
    };

    const saveEdit = async () => {
        if (editingId && editName.trim()) {
            await renameProject(editingId, editName.trim(), editColor);
            setEditingId(null);
        }
    };

    const handleCreate = async () => {
        if (newProjectName.trim()) {
            await createProject(newProjectName.trim(), newProjectColor);
            setNewProjectName('');
            setNewProjectColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="w-[400px] bg-bg1 border border-border1 rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-3 border-b border-border0 bg-bg1">
                    <h3 className="text-text1 text-xs font-medium uppercase tracking-wider">Manage Projects</h3>
                    <button onClick={toggleProjectManager} className="text-text2 hover:text-text1"><X size={14}/></button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {projects.map(p => {
                        const isEditing = editingId === p.id;
                        return (
                            <div key={p.id} className="flex items-center gap-2 p-2 bg-bg0 border border-border1 rounded-[2px] group">
                                {isEditing ? (
                                    <>
                                        {/* Edit Mode */}
                                        <div className="relative">
                                            <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-5 h-5 rounded overflow-hidden opacity-0 absolute inset-0 cursor-pointer" />
                                            <div className="w-5 h-5 rounded-full border border-border1" style={{ backgroundColor: editColor }} />
                                        </div>
                                        <input 
                                            autoFocus
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="flex-1 bg-bg1 border border-accent text-xs text-text0 px-2 py-1 rounded-[1px] outline-none"
                                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                        />
                                        <button onClick={saveEdit} className="text-success hover:bg-bg1 p-1 rounded"><Check size={12} /></button>
                                        <button onClick={() => setEditingId(null)} className="text-text2 hover:text-text1 p-1 rounded"><X size={12} /></button>
                                    </>
                                ) : (
                                    <>
                                        {/* View Mode */}
                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color || '#666' }}></div>
                                        <span className="flex-1 text-xs text-text0 truncate">{p.name}</span>
                                        
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => togglePinProject(p.id)} className={`p-1 hover:text-text0 ${p.pinned ? 'text-accent' : 'text-text2'}`} title={p.pinned ? "Unpin" : "Pin"}>
                                                {p.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                                            </button>
                                            <button onClick={() => startEditing(p)} className="p-1 text-text2 hover:text-info" title="Edit">
                                                <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => deleteProject(p.id)} className="p-1 text-text2 hover:text-danger" title="Delete">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                    
                    {projects.length === 0 && (
                        <div className="text-center text-text2 text-[10px] py-4 italic">No projects yet.</div>
                    )}
                </div>

                {/* Create Footer */}
                <div className="p-3 border-t border-border0 bg-bg0">
                    <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                            <input type="color" value={newProjectColor} onChange={e => setNewProjectColor(e.target.value)} className="w-6 h-6 rounded overflow-hidden opacity-0 absolute inset-0 cursor-pointer" />
                            <div className="w-6 h-6 rounded-full border border-border1 cursor-pointer hover:border-text2" style={{ backgroundColor: newProjectColor }} title="Pick Color" />
                        </div>
                        <input 
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            className="flex-1 bg-bg1 border border-border1 text-xs text-text0 px-2 py-1.5 rounded-[2px] focus:border-accent outline-none"
                            placeholder="New Project Name..."
                        />
                        <button 
                            onClick={handleCreate}
                            disabled={!newProjectName.trim()}
                            className="bg-bg2 border border-border1 text-text1 hover:text-text0 hover:bg-bg1 px-3 py-1.5 rounded-[2px] text-xs font-medium disabled:opacity-50"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
