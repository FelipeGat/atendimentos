import React, { useState, useEffect } from 'react';
import {
    Plus,
    MessageSquare,
    Clock,
    User,
    Edit,
    Trash2,
    X,
    Save,
    AlertCircle
} from 'lucide-react';
import { useMessage } from '../../hooks/useMessage';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Andamentos.css';

// Configuração da API
const API_BASE = "http://localhost/Atendimentos/backend/api";

const AndamentosCorrigidoCompleto = ({ atendimentoId, onClose }) => {
    // Estados principais
    const [andamentos, setAndamentos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estados do formulário
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        descricao: '',
        usuario_id: ''
    });

    const { message, showSuccess, showError } = useMessage();

    // Função para obter headers com empresa ID
    const getHeaders = () => {
        const empresaId = localStorage.getItem('empresa_id') ||
            sessionStorage.getItem('empresa_id') ||
            window.EMPRESA_ID ||
            '1';

        return {
            'X-Empresa-ID': empresaId,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    };

    // Função para requisições API
    const apiRequest = async (url, options = {}) => {
        const headers = getHeaders();

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        };

        console.log('=== REQUISIÇÃO API ANDAMENTOS ===');
        console.log('URL:', url);
        console.log('Headers:', config.headers);
        console.log('Method:', config.method || 'GET');

        try {
            const response = await fetch(url, config);

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            // Verificar se a resposta é JSON
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);

            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.log('Response text (não JSON):', textResponse.substring(0, 500));

                let errorMessage = 'Erro no servidor';
                if (response.status === 404) {
                    errorMessage = 'API não encontrada (404). Verifique se o XAMPP está rodando e o arquivo existe em: C:\\xampp\\htdocs\\Atendimentos\\backend\\api\\andamentos.php';
                } else if (response.status === 500) {
                    errorMessage = 'Erro interno do servidor (500)';
                } else if (response.status === 403) {
                    errorMessage = 'Acesso negado (403)';
                } else if (response.status === 0) {
                    errorMessage = 'Erro de CORS ou servidor não acessível. Verifique se o XAMPP está rodando.';
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Erro na requisição:', error);

            // Tratamento específico para erros de rede
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Erro de conexão. Verifique se o XAMPP está rodando na porta 80.');
            }

            throw error;
        }
    };

    // Carregar dados
    const fetchData = async () => {
        try {
            setLoading(true);
            console.log('=== CARREGANDO ANDAMENTOS ===');
            console.log('Atendimento ID:', atendimentoId);
            console.log('API Base:', API_BASE);

            // URLs absolutas
            const andamentosUrl = `${API_BASE}/andamentos.php?atendimento_id=${atendimentoId}`;
            const usuariosUrl = `${API_BASE}/usuarios.php`;

            // Carregar andamentos
            const andamentosResult = await apiRequest(andamentosUrl);
            console.log('Andamentos carregados:', andamentosResult);

            // Carregar usuários (com fallback se não existir)
            let usuariosResult;
            try {
                usuariosResult = await apiRequest(usuariosUrl);
                console.log('Usuários carregados:', usuariosResult);
            } catch (error) {
                console.log('Erro ao carregar usuários, usando fallback:', error.message);
                usuariosResult = {
                    data: [
                        { id: 1, nome: 'Felipe Henrique Gat' },
                        { id: 2, nome: 'Administrador' },
                        { id: 3, nome: 'Técnico 1' }
                    ]
                };
            }

            setAndamentos(andamentosResult.data || []);
            setUsuarios(usuariosResult.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showError('Erro ao carregar andamentos: ' + error.message);

            // Definir dados vazios em caso de erro
            setAndamentos([]);
            setUsuarios([
                { id: 1, nome: 'Felipe Henrique Gat' },
                { id: 2, nome: 'Administrador' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (atendimentoId) {
            fetchData();
        }
    }, [atendimentoId]);

    // Handlers
    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            descricao: '',
            usuario_id: localStorage.getItem('usuario_id') || '1'
        });
        setShowForm(true);
    };

    const handleEdit = (andamento) => {
        setEditingId(andamento.id);
        setFormData({
            descricao: andamento.descricao,
            usuario_id: andamento.usuario_id
        });
        setShowForm(true);
    };

    const handleDelete = async (andamento) => {
        if (!window.confirm(`Tem certeza que deseja excluir este andamento?`)) return;

        try {
            setSaving(true);

            const url = `${API_BASE}/andamentos.php?id=${andamento.id}`;
            await apiRequest(url, { method: 'DELETE' });

            showSuccess('Andamento excluído com sucesso');
            await fetchData();
        } catch (error) {
            console.error('Erro ao excluir andamento:', error);
            showError('Erro ao excluir andamento: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const validateForm = () => {
        if (!formData.descricao || !formData.descricao.trim()) {
            showError('Descrição é obrigatória');
            return false;
        }
        if (formData.descricao.trim().length < 10) {
            showError('Descrição deve ter pelo menos 10 caracteres');
            return false;
        }
        if (!formData.usuario_id) {
            showError('Usuário é obrigatório');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSaving(true);

            const payload = {
                descricao: formData.descricao.trim(),
                atendimento_id: atendimentoId,
                usuario_id: formData.usuario_id
            };

            console.log('=== SALVANDO ANDAMENTO ===');
            console.log('Payload:', payload);
            console.log('Editando ID:', editingId);

            if (editingId) {
                // Editar (se sua API suportar PUT)
                const url = `${API_BASE}/andamentos.php?id=${editingId}`;
                await apiRequest(url, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                showSuccess('Andamento atualizado com sucesso');
            } else {
                // Criar novo
                const url = `${API_BASE}/andamentos.php`;
                await apiRequest(url, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showSuccess('Andamento criado com sucesso');
            }

            setShowForm(false);
            await fetchData();
        } catch (error) {
            console.error('Erro ao salvar andamento:', error);
            showError('Erro ao salvar andamento: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Funções auxiliares
    const getUsuarioNome = (usuarioId) => {
        if (!usuarioId) return '-';
        const usuario = usuarios.find(u => String(u.id) === String(usuarioId));
        return usuario ? usuario.nome : `Usuário #${usuarioId}`;
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeAgo = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
        if (diffHours > 0) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        return 'agora mesmo';
    };

    if (loading) return <LoadingSpinner message="Carregando andamentos..." />;

    return (
        <div className="andamentos-refatorado">
            <Message message={message} />

            {/* Header */}
            <div className="andamentos-header">
                <div className="header-left">
                    <h3>
                        <MessageSquare size={20} />
                        Andamentos
                    </h3>
                    <span className="andamentos-count">
                        {andamentos.length} andamento{andamentos.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={handleCreate}
                        disabled={saving}
                    >
                        <Plus size={16} />
                        Novo Andamento
                    </button>
                </div>
            </div>

            {/* Formulário */}
            {showForm && (
                <div className="andamento-form-container">
                    <div className="form-header">
                        <h4>{editingId ? 'Editar Andamento' : 'Novo Andamento'}</h4>
                        <button
                            className="btn-close"
                            onClick={() => setShowForm(false)}
                            disabled={saving}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="andamento-form">
                        <div className="form-group">
                            <label htmlFor="usuario_id">Usuário *</label>
                            <select
                                id="usuario_id"
                                value={formData.usuario_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, usuario_id: e.target.value }))}
                                required
                                disabled={saving}
                            >
                                <option value="">Selecione um usuário</option>
                                {usuarios.map(usuario => (
                                    <option key={usuario.id} value={usuario.id}>
                                        {usuario.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="descricao">Descrição *</label>
                            <textarea
                                id="descricao"
                                value={formData.descricao}
                                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                                placeholder="Descreva o andamento do atendimento..."
                                rows={4}
                                required
                                minLength={10}
                                disabled={saving}
                            />
                            <small className="form-help">
                                Mínimo 10 caracteres. Atual: {formData.descricao.length}
                            </small>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowForm(false)}
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Clock size={16} className="spinning" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        {editingId ? 'Atualizar' : 'Criar'} Andamento
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Timeline de Andamentos */}
            <div className="andamentos-timeline">
                {andamentos.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <MessageSquare size={48} />
                        </div>
                        <h4>Nenhum andamento registrado</h4>
                        <p>Clique em "Novo Andamento" para registrar o primeiro andamento deste atendimento.</p>
                    </div>
                ) : (
                    <div className="timeline">
                        {andamentos
                            .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
                            .map((andamento, index) => (
                                <div key={andamento.id} className="timeline-item">
                                    <div className="timeline-marker">
                                        <div className="marker-dot"></div>
                                        {index < andamentos.length - 1 && <div className="marker-line"></div>}
                                    </div>

                                    <div className="timeline-content">
                                        <div className="andamento-card">
                                            <div className="card-header">
                                                <div className="header-info">
                                                    <div className="user-info">
                                                        <User size={16} />
                                                        <span className="user-name">
                                                            {andamento.usuario_nome || getUsuarioNome(andamento.usuario_id)}
                                                        </span>
                                                    </div>

                                                    <div className="time-info">
                                                        <Clock size={14} />
                                                        <span className="time-text">
                                                            {formatDateTime(andamento.criado_em)}
                                                        </span>
                                                        <span className="time-ago">
                                                            ({getTimeAgo(andamento.criado_em)})
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="card-actions">
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={() => handleEdit(andamento)}
                                                        title="Editar"
                                                        disabled={saving}
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDelete(andamento)}
                                                        title="Excluir"
                                                        disabled={saving}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="card-content">
                                                <p className="andamento-description">
                                                    {andamento.descricao}
                                                </p>

                                                {andamento.atualizado_em && andamento.atualizado_em !== andamento.criado_em && (
                                                    <div className="update-info">
                                                        <small>
                                                            Editado em {formatDateTime(andamento.atualizado_em)}
                                                        </small>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Debug Info */}
            <div className="debug-info">
                <details>
                    <summary>Debug Info</summary>
                    <div className="debug-content">
                        <p><strong>Atendimento ID:</strong> {atendimentoId}</p>
                        <p><strong>Total Andamentos:</strong> {andamentos.length}</p>
                        <p><strong>Empresa ID:</strong> {getHeaders()['X-Empresa-ID']}</p>
                        <p><strong>Usuário Atual:</strong> {localStorage.getItem('usuario_id') || 'Não definido'}</p>
                        <p><strong>API Base:</strong> {API_BASE}</p>
                        <p><strong>URL Completa:</strong> {API_BASE}/andamentos.php?atendimento_id={atendimentoId}</p>
                        <p><strong>Status:</strong> {andamentos.length > 0 ? '✅ API funcionando' : '❌ Sem dados ou API com problema'}</p>
                        <p><strong>XAMPP Status:</strong> Verifique se está rodando em http://localhost</p>
                    </div>
                </details>
            </div>
        </div>
    );
};

export default AndamentosCorrigidoCompleto;

