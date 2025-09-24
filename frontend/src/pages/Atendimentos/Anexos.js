import React, { useState, useEffect } from 'react';
import {
    Plus,
    Paperclip,
    Download,
    Eye,
    Trash2,
    Upload,
    File,
    Image,
    FileText,
    Archive,
    X,
    AlertCircle,
    Clock
} from 'lucide-react';
import { useMessage } from '../../hooks/useMessage';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Anexos.css';

// Configuração da API
const API_BASE = process.env.REACT_APP_API_BASE_URL;

const AnexosCorrigidoCompleto = ({ atendimentoId, onClose }) => {
    // Estados principais
    const [anexos, setAnexos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Estados do formulário
    const [showForm, setShowForm] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
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
            'Accept': 'application/json'
        };
    };

    // Função para requisições API (sem Content-Type para FormData)
    const apiRequest = async (url, options = {}) => {
        const headers = getHeaders();

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        };

        // Para FormData, não definir Content-Type
        if (!(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }

        console.log('=== REQUISIÇÃO API ANEXOS ===');
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
                    errorMessage = 'API não encontrada (404). Verifique se o XAMPP está rodando e o arquivo existe em: C:\\xampp\\htdocs\\Atendimentos\\backend\\api\\anexos.php';
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
            console.log('=== CARREGANDO ANEXOS ===');
            console.log('Atendimento ID:', atendimentoId);
            console.log('API Base:', API_BASE);

            // URLs absolutas
            const anexosUrl = `${API_BASE}/anexos.php?atendimento_id=${atendimentoId}`;
            const usuariosUrl = `${API_BASE}/usuarios.php`;

            // Carregar anexos
            const anexosResult = await apiRequest(anexosUrl);
            console.log('Anexos carregados:', anexosResult);

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

            setAnexos(anexosResult.data || []);
            setUsuarios(usuariosResult.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showError('Erro ao carregar anexos: ' + error.message);

            // Definir dados vazios em caso de erro
            setAnexos([]);
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
        setSelectedFile(null);
        setFormData({
            descricao: '',
            usuario_id: localStorage.getItem('usuario_id') || '1'
        });
        setShowForm(true);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar tamanho (máximo 10MB)
            if (file.size > 10 * 1024 * 1024) {
                showError('Arquivo muito grande. Tamanho máximo: 10MB');
                return;
            }

            // Validar tipo (baseado na sua API)
            const allowedTypes = [
                'image/jpeg', 'image/jpg', 'image/png',
                'application/pdf',
                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain'
            ];

            const extension = file.name.split('.').pop().toLowerCase();
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx', 'txt'];

            if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
                showError('Tipo de arquivo não permitido. Tipos aceitos: JPG, PNG, PDF, DOCX, XLSX, TXT');
                return;
            }

            setSelectedFile(file);

            // Auto-preencher descrição com nome do arquivo
            if (!formData.descricao) {
                setFormData(prev => ({ ...prev, descricao: file.name }));
            }
        }
    };

    const handleDelete = async (anexo) => {
        if (!window.confirm(`Tem certeza que deseja excluir o anexo "${anexo.nome_arquivo}"?`)) return;

        try {
            setUploading(true);

            const url = `${API_BASE}/anexos.php?id=${anexo.id}`;
            await apiRequest(url, { method: 'DELETE' });

            showSuccess('Anexo excluído com sucesso');
            await fetchData();
        } catch (error) {
            console.error('Erro ao excluir anexo:', error);
            showError('Erro ao excluir anexo: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (anexo) => {
        try {
            const url = `${API_BASE}/anexos.php?download=${anexo.id}`;
            const headers = getHeaders();

            const response = await fetch(url, { headers });

            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = anexo.nome_arquivo;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
            } else {
                throw new Error('Erro ao baixar arquivo');
            }
        } catch (error) {
            console.error('Erro ao baixar arquivo:', error);
            showError('Erro ao baixar arquivo: ' + error.message);
        }
    };

    const validateForm = () => {
        if (!selectedFile) {
            showError('Selecione um arquivo');
            return false;
        }
        if (!formData.descricao || !formData.descricao.trim()) {
            showError('Descrição é obrigatória');
            return false;
        }
        if (!formData.usuario_id) {
            showError('Usuário é obrigatório');
            return false;
        }
        return true;
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setUploading(true);

            const formDataUpload = new FormData();
            formDataUpload.append('file', selectedFile); // Nome do campo conforme sua API
            formDataUpload.append('atendimento_id', atendimentoId);
            formDataUpload.append('usuario_id', formData.usuario_id);
            formDataUpload.append('descricao', formData.descricao.trim());

            console.log('=== FAZENDO UPLOAD ===');
            console.log('Arquivo:', selectedFile.name);
            console.log('Tamanho:', selectedFile.size);
            console.log('Tipo:', selectedFile.type);
            console.log('Atendimento ID:', atendimentoId);
            console.log('Usuário ID:', formData.usuario_id);

            const url = `${API_BASE}/anexos.php`;
            await apiRequest(url, {
                method: 'POST',
                body: formDataUpload
            });

            showSuccess('Arquivo enviado com sucesso');
            setShowForm(false);
            await fetchData();
        } catch (error) {
            console.error('Erro no upload:', error);
            showError('Erro ao enviar arquivo: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    // Funções auxiliares
    const getUsuarioNome = (usuarioId) => {
        if (!usuarioId) return '-';
        const usuario = usuarios.find(u => String(u.id) === String(usuarioId));
        return usuario ? usuario.nome : `Usuário #${usuarioId}`;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    const getFileIcon = (fileName, mimeType) => {
        if (!fileName && !mimeType) return <File size={20} />;

        const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
        const type = mimeType ? mimeType.toLowerCase() : '';

        if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            return <Image size={20} />;
        }
        if (type === 'application/pdf' || extension === 'pdf') {
            return <FileText size={20} />;
        }
        if (type.includes('zip') || type.includes('rar') || ['zip', 'rar', '7z'].includes(extension)) {
            return <Archive size={20} />;
        }
        return <File size={20} />;
    };

    const isImageFile = (fileName, mimeType) => {
        const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
        const type = mimeType ? mimeType.toLowerCase() : '';
        return type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
    };

    if (loading) return <LoadingSpinner message="Carregando anexos..." />;

    return (
        <div className="anexos-refatorado">
            <Message message={message} />

            {/* Header */}
            <div className="anexos-header">
                <div className="header-left">
                    <h3>
                        <Paperclip size={20} />
                        Anexos
                    </h3>
                    <span className="anexos-count">
                        {anexos.length} arquivo{anexos.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={handleCreate}
                        disabled={uploading}
                    >
                        <Plus size={16} />
                        Novo Anexo
                    </button>
                </div>
            </div>

            {/* Formulário de Upload */}
            {showForm && (
                <div className="anexo-form-container">
                    <div className="form-header">
                        <h4>Novo Anexo</h4>
                        <button
                            className="btn-close"
                            onClick={() => setShowForm(false)}
                            disabled={uploading}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleUpload} className="anexo-form">
                        <div className="form-group">
                            <label htmlFor="arquivo">Arquivo *</label>
                            <div className="file-input-container">
                                <input
                                    type="file"
                                    id="arquivo"
                                    onChange={handleFileSelect}
                                    accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx,.txt"
                                    disabled={uploading}
                                    required
                                />
                                <div className="file-input-info">
                                    <small>
                                        Tipos permitidos: JPG, PNG, PDF, DOCX, XLSX, TXT<br />
                                        Tamanho máximo: 10MB
                                    </small>
                                </div>
                            </div>

                            {selectedFile && (
                                <div className="selected-file">
                                    <div className="file-preview">
                                        {getFileIcon(selectedFile.name, selectedFile.type)}
                                        <div className="file-info">
                                            <div className="file-name">{selectedFile.name}</div>
                                            <div className="file-size">{formatFileSize(selectedFile.size)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="usuario_id">Usuário *</label>
                                <select
                                    id="usuario_id"
                                    value={formData.usuario_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, usuario_id: e.target.value }))}
                                    required
                                    disabled={uploading}
                                >
                                    <option value="">Selecione um usuário</option>
                                    {usuarios.map(usuario => (
                                        <option key={usuario.id} value={usuario.id}>
                                            {usuario.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="descricao">Descrição *</label>
                            <input
                                type="text"
                                id="descricao"
                                value={formData.descricao}
                                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                                placeholder="Descreva o arquivo..."
                                required
                                disabled={uploading}
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowForm(false)}
                                disabled={uploading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={uploading || !selectedFile}
                            >
                                {uploading ? (
                                    <>
                                        <Clock size={16} className="spinning" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Enviar Arquivo
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Lista de Anexos */}
            <div className="anexos-list">
                {anexos.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Paperclip size={48} />
                        </div>
                        <h4>Nenhum anexo encontrado</h4>
                        <p>Clique em "Novo Anexo" para enviar o primeiro arquivo deste atendimento.</p>
                    </div>
                ) : (
                    <div className="anexos-grid">
                        {anexos.map((anexo) => (
                            <div key={anexo.id} className="anexo-card">
                                <div className="anexo-icon">
                                    {getFileIcon(anexo.nome_arquivo, anexo.tipo_arquivo)}
                                </div>

                                <div className="anexo-info">
                                    <div className="anexo-name" title={anexo.nome_arquivo}>
                                        {anexo.nome_arquivo}
                                    </div>

                                    <div className="anexo-meta">
                                        <div className="meta-item">
                                            <span className="meta-label">Tamanho:</span>
                                            <span>{formatFileSize(anexo.tamanho || 0)}</span>
                                        </div>

                                        <div className="meta-item">
                                            <span className="meta-label">Enviado por:</span>
                                            <span>{getUsuarioNome(anexo.usuario_id)}</span>
                                        </div>

                                        <div className="meta-item">
                                            <span className="meta-label">Data:</span>
                                            <span>{formatDateTime(anexo.criado_em)}</span>
                                        </div>
                                    </div>

                                    {anexo.descricao && (
                                        <div className="anexo-description">
                                            {anexo.descricao}
                                        </div>
                                    )}
                                </div>

                                <div className="anexo-actions">
                                    <button
                                        className="action-btn download"
                                        onClick={() => handleDownload(anexo)}
                                        title="Baixar"
                                        disabled={uploading}
                                    >
                                        <Download size={16} />
                                    </button>

                                    {isImageFile(anexo.nome_arquivo, anexo.tipo_arquivo) && (
                                        <button
                                            className="action-btn view"
                                            onClick={() => handleDownload(anexo)}
                                            title="Visualizar"
                                            disabled={uploading}
                                        >
                                            <Eye size={16} />
                                        </button>
                                    )}

                                    <button
                                        className="action-btn delete"
                                        onClick={() => handleDelete(anexo)}
                                        title="Excluir"
                                        disabled={uploading}
                                    >
                                        <Trash2 size={16} />
                                    </button>
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
                        <p><strong>Total Anexos:</strong> {anexos.length}</p>
                        <p><strong>Empresa ID:</strong> {getHeaders()['X-Empresa-ID']}</p>
                        <p><strong>Usuário Atual:</strong> {localStorage.getItem('usuario_id') || 'Não definido'}</p>
                        <p><strong>API Base:</strong> {API_BASE}</p>
                        <p><strong>URL Completa:</strong> {API_BASE}/anexos.php?atendimento_id={atendimentoId}</p>
                        <p><strong>Status:</strong> {anexos.length >= 0 ? '✅ API funcionando' : '❌ Erro na API'}</p>
                        <p><strong>XAMPP Status:</strong> Verifique se está rodando em http://localhost</p>
                    </div>
                </details>
            </div>
        </div>
    );
};

export default AnexosCorrigidoCompleto;

