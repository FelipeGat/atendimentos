import React, { useState, useEffect } from 'react';
import { usuariosAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
import { useTableControls } from '../../hooks/useTableControls';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Usuarios.css'; // Importa o CSS refatorado

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        senha: '',
        confirmarSenha: '',
        perfil: 'Usuario',
        bloqueado: 0,
        foto: null,
        fotoPreview: ''
    });

    const { message, showSuccess, showError } = useMessage();
    const {
        searchTerm,
        setSearchTerm,
        recordsPerPage,
        setRecordsPerPage,
        displayedData,
        handleSort,
        getSortIcon,
        filteredRecords,
        totalRecords
    } = useTableControls(usuarios);

    const perfisDisponiveis = ['Admin', 'Tecnico', 'Usuario'];

    // Carregar dados iniciais
    const fetchData = async () => {
        try {
            setLoading(true);
            const result = await usuariosAPI.listar();
            setUsuarios(result.data || []);
        } catch (error) {
            showError('Erro ao carregar usuários: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Criar novo usuário
    const handleCreate = () => {
        setEditingUsuario(null);
        setFormData({
            nome: '',
            email: '',
            telefone: '',
            cpf: '',
            senha: '',
            confirmarSenha: '',
            perfil: 'Usuario',
            bloqueado: 0,
            foto: null,
            fotoPreview: ''
        });
        setShowModal(true);
    };

    // Editar usuário
    const handleEdit = (usuario) => {
        setEditingUsuario(usuario);
        setFormData({
            nome: usuario.nome || '',
            email: usuario.email || '',
            telefone: usuario.telefone || '',
            cpf: usuario.cpf || '',
            senha: '', // Senha não é preenchida por segurança
            confirmarSenha: '',
            perfil: usuario.perfil || 'Usuario',
            bloqueado: usuario.bloqueado ? 1 : 0,
            foto: null,
            fotoPreview: usuario.foto ? `URL_BASE_DA_API/${usuario.foto}` : '' // Ajuste a URL base
        });
        setShowModal(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUsuario(null);
        setFormData({
            nome: '',
            email: '',
            telefone: '',
            cpf: '',
            senha: '',
            confirmarSenha: '',
            perfil: 'Usuario',
            bloqueado: 0,
            foto: null,
            fotoPreview: ''
        });
    };

    // Validar formulário
    const validateForm = () => {
        if (!formData.nome.trim()) {
            showError('Nome é obrigatório');
            return false;
        }
        if (formData.email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
            showError('Email inválido');
            return false;
        }
        const cpfLimpo = formData.cpf.replace(/\D/g, '');
        if (cpfLimpo && cpfLimpo.length !== 11) {
            showError('CPF inválido');
            return false;
        }
        if (!editingUsuario || formData.senha) {
            if (!formData.senha || formData.senha.length < 6) {
                showError('A senha deve ter no mínimo 6 caracteres');
                return false;
            }
            if (formData.senha !== formData.confirmarSenha) {
                showError('As senhas não coincidem');
                return false;
            }
        }
        return true;
    };

    // Salvar usuário
    const handleSave = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            // Usamos FormData para enviar arquivos (foto)
            const dataToSave = new FormData();
            dataToSave.append('nome', formData.nome.trim());
            dataToSave.append('email', formData.email.trim());
            dataToSave.append('telefone', formData.telefone.trim());
            dataToSave.append('cpf', formData.cpf.replace(/\D/g, ''));
            dataToSave.append('perfil', formData.perfil);
            dataToSave.append('bloqueado', formData.bloqueado);

            if (formData.senha) {
                dataToSave.append('senha', formData.senha);
            }
            if (formData.foto instanceof File) {
                dataToSave.append('foto', formData.foto);
            }

            if (editingUsuario) {
                await usuariosAPI.atualizar(editingUsuario.id, dataToSave);
                showSuccess('Usuário atualizado com sucesso');
            } else {
                await usuariosAPI.criar(dataToSave);
                showSuccess('Usuário criado com sucesso');
            }

            handleCloseModal();
            fetchData();
        } catch (error) {
            showError('Erro ao salvar usuário: ' + error.message);
        }
    };

    // Excluir usuário
    const handleDelete = async (usuario) => {
        if (!window.confirm(`Tem certeza que deseja excluir o usuário "${usuario.nome}"?`)) {
            return;
        }
        try {
            await usuariosAPI.excluir(usuario.id);
            showSuccess('Usuário excluído com sucesso');
            fetchData();
        } catch (error) {
            showError('Erro ao excluir usuário: ' + error.message);
        }
    };

    // Formatar CPF
    const formatCPF = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .slice(0, 14);
    };

    // Lidar com mudança de foto
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                foto: file,
                fotoPreview: URL.createObjectURL(file)
            }));
        }
    };

    if (loading) {
        return <LoadingSpinner message="Carregando usuários..." />;
    }

    return (
        <div className="usuarios-container">
            {message.text && <Message type={message.type} text={message.text} />}

            <div className="usuarios-header">
                <h1>Gerenciamento de Usuários</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    ➕ Novo Usuário
                </button>
            </div>

            <div className="usuarios-content">
                <div className="table-controls">
                    <div className="control-group">
                        <div className="records-per-page">
                            <label htmlFor="recordsPerPage">Registros por página:</label>
                            <select id="recordsPerPage" value={recordsPerPage} onChange={(e) => setRecordsPerPage(parseInt(e.target.value))}>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <div className="search-box">
                            <label htmlFor="search">🔍 Buscar:</label>
                            <input type="text" id="search" placeholder="Digite para buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="usuarios-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')}>ID {getSortIcon('id')}</th>
                                <th onClick={() => handleSort('nome')}>Nome {getSortIcon('nome')}</th>
                                <th onClick={() => handleSort('email')}>Email {getSortIcon('email')}</th>
                                <th onClick={() => handleSort('telefone')}>Telefone {getSortIcon('telefone')}</th>
                                <th onClick={() => handleSort('cpf')}>CPF {getSortIcon('cpf')}</th>
                                <th onClick={() => handleSort('perfil')}>Perfil {getSortIcon('perfil')}</th>
                                <th onClick={() => handleSort('bloqueado')}>Status {getSortIcon('bloqueado')}</th>
                                <th onClick={() => handleSort('criado_em')}>Criado em {getSortIcon('criado_em')}</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedData.length === 0 ? (
                                <tr><td colSpan="9" className="no-records-found">{searchTerm ? '🔍 Nenhum registro encontrado.' : '📋 Nenhum usuário encontrado.'}</td></tr>
                            ) : (
                                displayedData.map((usuario) => (
                                    <tr key={usuario.id}>
                                        <td>{usuario.id}</td>
                                        <td>{usuario.nome}</td>
                                        <td>{usuario.email || '–'}</td>
                                        <td>{usuario.telefone || '–'}</td>
                                        <td>{usuario.cpf ? formatCPF(usuario.cpf) : '–'}</td>
                                        <td>{usuario.perfil}</td>
                                        <td><span className={`status-badge ${!usuario.bloqueado ? 'ativo' : 'inativo'}`}>{!usuario.bloqueado ? '✅ Ativo' : '❌ Bloqueado'}</span></td>
                                        <td>{new Date(usuario.criado_em).toLocaleDateString('pt-BR')}</td>
                                        <td className="actions-cell">
                                            <button className="btn-edit" onClick={() => handleEdit(usuario)} title="Editar">✏️ Editar</button>
                                            <button className="btn-delete" onClick={() => handleDelete(usuario)} title="Excluir">🗑️ Excluir</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination">
                    <div className="pagination-info">
                        Mostrando {displayedData.length} de {filteredRecords} registros
                        {searchTerm && ` (filtrado de ${totalRecords} no total)`}
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingUsuario ? '✏️ Editar Usuário' : '➕ Novo Usuário'}</h2>
                            <button className="modal-close" onClick={handleCloseModal}>✕</button>
                        </div>
                        <form onSubmit={handleSave} className="modal-form" noValidate>
                            <div className="form-sections">
                                <div className="form-section">
                                    <h3 className="section-title">Informações Básicas</h3>
                                    <div className="form-grid">
                                        <div className="form-group"><label htmlFor="nome">Nome Completo:</label><input type="text" id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required /></div>
                                        <div className="form-group"><label htmlFor="email">Email:</label><input type="email" id="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                                        <div className="form-group"><label htmlFor="telefone">Telefone:</label><input type="text" id="telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} /></div>
                                        <div className="form-group"><label htmlFor="cpf">CPF:</label><input type="text" id="cpf" value={formatCPF(formData.cpf)} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} /></div>
                                    </div>
                                </div>
                                <div className="form-section">
                                    <h3 className="section-title">Segurança e Acesso</h3>
                                    <div className="form-grid">
                                        <div className="form-group"><label htmlFor="senha">Senha:</label><input type="password" id="senha" value={formData.senha} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} placeholder={editingUsuario ? 'Deixe em branco para manter' : ''} /></div>
                                        <div className="form-group"><label htmlFor="confirmarSenha">Confirmar Senha:</label><input type="password" id="confirmarSenha" value={formData.confirmarSenha} onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })} /></div>
                                        <div className="form-group"><label htmlFor="perfil">Perfil:</label><select id="perfil" value={formData.perfil} onChange={(e) => setFormData({ ...formData, perfil: e.target.value })}>{perfisDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                                        <div className="form-group"><label htmlFor="bloqueado">Status:</label><select id="bloqueado" value={formData.bloqueado} onChange={(e) => setFormData({ ...formData, bloqueado: parseInt(e.target.value) })}><option value={0}>✅ Ativo</option><option value={1}>❌ Bloqueado</option></select></div>
                                    </div>
                                </div>
                                <div className="form-section">
                                    <h3 className="section-title">Foto de Perfil</h3>
                                    <div className="form-grid">
                                        <div className="form-group form-group-full">
                                            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ border: 'none', paddingLeft: 0 }} />
                                            {formData.fotoPreview && <img src={formData.fotoPreview} alt="Preview" style={{ maxWidth: '150px', marginTop: '10px', borderRadius: '8px' }} />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={handleCloseModal}>❌ Cancelar</button>
                                <button type="submit" className="btn-primary">{editingUsuario ? '💾 Atualizar' : '💾 Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usuarios;
