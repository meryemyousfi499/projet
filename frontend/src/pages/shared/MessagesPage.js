import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiPaperclip, FiDownload, FiFile, FiMessageSquare, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getProjects, getMessages, sendMessage, sendFile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatMessage from '../../components/chat/ChatMessage';
import ChatInput from '../../components/chat/ChatInput';
import Avatar from '../../components/common/Avatar';

const formatTime = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return `Hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

export default function MessagesPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    loadProjects();
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadMessages(selectedProject._id, true);
      clearInterval(pollRef.current);
      pollRef.current = setInterval(() => loadMessages(selectedProject._id, false), 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [selectedProject]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '';
      toast.error(msg || 'Erreur chargement projets');
    } finally { setLoadingProjects(false); }
  };

  const loadMessages = async (projectId, showLoader = true) => {
    if (showLoader) setLoadingMessages(true);
    try {
      const res = await getMessages(projectId);
      setMessages(res.data.data);
    } catch {} finally { if (showLoader) setLoadingMessages(false); }
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await sendMessage(selectedProject._id, { content: text.trim() });
      setMessages(prev => [...prev, res.data.data]);
      setText('');
    } catch { toast.error('Erreur envoi message'); }
    finally { setSending(false); }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop grand (max 20MB)'); return; }
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await sendFile(selectedProject._id, formData);
      setMessages(prev => [...prev, res.data.data]);
      toast.success('Fichier envoyé!');
    } catch { toast.error('Erreur upload fichier'); }
    finally { setUploadingFile(false); e.target.value = ''; }
  };

  const getOtherParty = (project) => {
    if (!project) return null;
    if (user.role === 'ROLE_STUDENT') return project.encadrantId;
    return null;
  };

  const getProjectLabel = (project) => {
    if (!project) return '';
    if (user.role === 'ROLE_STUDENT') {
      return `${project.encadrantId?.prenom || ''} ${project.encadrantId?.nom || ''}`.trim() || 'Encadrant';
    }
    return project.etudiants?.map(e => `${e.prenom} ${e.nom}`).join(', ') || 'Groupe';
  };

  if (loadingProjects) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  const activeProjects = projects.filter(p => p.statut === 'en cours' || p.statut === 'terminé');

  return (
    <div className="app-layout">
      <ChatSidebar
        projects={activeProjects}
        selectedId={selectedProject?._id}
        onSelect={setSelectedProject}
        loading={loadingProjects}
      />

      <div className="chat-window">
        <div className="chat-header">
          {selectedProject ? (
            <>
              <Avatar user={getOtherParty(selectedProject)} size={36} />
              <div className="chat-header-title">
                {getProjectLabel(selectedProject)}
              </div>
            </>
          ) : (
            <div className="chat-header-title">Sélectionnez un projet</div>
          )}
        </div>

        <div className="chat-history">
          {loadingMessages && (
            <div className="loading-spinner"><div className="spinner"></div></div>
          )}
          {messages.map(msg => (
            <ChatMessage key={msg._id} message={msg} currentUser={user} />
          ))}
          <div ref={bottomRef} />
        </div>

        {selectedProject && (
          <ChatInput
            text={text}
            onChange={setText}
            onSend={handleSend}
            onFileSelect={handleFileSelect}
            sending={sending}
            uploading={uploadingFile}
          />
        )}
      </div>
    </div>
  );
}
