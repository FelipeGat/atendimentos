import React, { useState, useEffect } from 'react';
import './Empresas.css';

// Função para obter headers padrão
const getDefaultHeaders = (isFormData = false, empresaId = null) => {
    const headers = {};
    if (empresaId) {
        headers['X-Empresa-ID'] = empresaId;
    }
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

const EmpresasCompleto = () => {
    const [empresas, setEmpresas] = useState([]);
    const [segmentos, setSegmentos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState('id');
    const [sortDirection, setSortDirection] = useState('asc');
    const [logoPreview, setLogoPreview] = useState(null);

    const [formData, setFormData] = useState({
        cnpj: '',
        razao_social: '',
        nome_fantasia: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        telefone: '',
        email: '',
        inscricao_municipal: '',
        inscricao_estadual: '',
        logomarca: null,
        segmentosSelecionados: [],
        tecnicosResponsaveis: [],
        custo_operacional_dia: 0,
        custo_operacional_semana: 0,
        custo_operacional_mes: 0,
        custo_operacional_ano: 0,
        ativo: 1
    });

    // Estados brasileiros
    const estados = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    // Função para mostrar mensagens
    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    // Carregar dados iniciais
    const fetchData = async () => {
        try {
            setLoading(true);

            const [empresasResponse, segmentosResponse, usuariosResponse] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_BASE_URL}/empresas.php`, {
                    method: 'GET',
                    headers: getDefaultHeaders()
                }),
                fetch(`${process.env.REACT_APP_API_BASE_URL}/segmentos.php`, {
                    method: 'GET',
                    headers: getDefaultHeaders()
                }),
                fetch(`${process.env.REACT_APP_API_BASE_URL}/usuarios.php`, {
                    method: 'GET',
                    headers: getDefaultHeaders()
                })
            ]);

            // Processar respostas
            if (empresasResponse.ok) {
                const empresasResult = await empresasResponse.json();
                setEmpresas(empresasResult.success ? empresasResult.data : []);
            }

            if (segmentosResponse.ok) {
                const segmentosResult = await segmentosResponse.json();
                setSegmentos(segmentosResult.success ? segmentosResult.data : []);
            } else {
                // Dados mock para segmentos
                setSegmentos([
                    { id: 1, nome: 'Tecnologia' },
                    { id: 2, nome: 'Saúde' },
                    { id: 3, nome: 'Educação' },
                    { id: 4, nome: 'Comércio' },
                    { id: 5, nome: 'Indústria' },
                    { id: 6, nome: 'Serviços' }
                ]);
            }

            if (usuariosResponse.ok) {
                const usuariosResult = await usuariosResponse.json();
                setUsuarios(usuariosResult.success ? usuariosResult.data : []);
            } else {
            }

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showMessage('Erro ao carregar dados: ' + error.message, 'error');

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Manipular mudanças no formulário
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;

        if (name === 'logomarca') {
            const file = e.target.files[0];
            setFormData(prev => ({ ...prev, logomarca: file }));

            // Preview da imagem
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => setLogoPreview(e.target.result);
                reader.readAsDataURL(file);
            } else {
                setLogoPreview(null);
            }
            return;
        }

        let newFormData = { ...formData, [name]: type === 'checkbox' ? (e.target.checked ? 1 : 0) : value };

        // Cálculo automático dos custos operacionais
        if (name === 'custo_operacional_dia') {
            const custoDia = parseFloat(value) || 0;
            newFormData.custo_operacional_semana = (custoDia * 5).toFixed(2);
            newFormData.custo_operacional_mes = (custoDia * 30).toFixed(2);
            newFormData.custo_operacional_ano = (custoDia * 365).toFixed(2);
        }

        setFormData(newFormData);
    };

    // Manipular seleção múltipla de segmentos
    const handleSegmentosChange = (segmentoId) => {
        const segmentos = [...formData.segmentosSelecionados];
        const index = segmentos.indexOf(segmentoId);

        if (index > -1) {
            segmentos.splice(index, 1);
        } else {
            segmentos.push(segmentoId);
        }

        setFormData(prev => ({ ...prev, segmentosSelecionados: segmentos }));
    };

    // Manipular seleção múltipla de técnicos
    const handleTecnicosChange = (usuarioId) => {
        const tecnicos = [...formData.tecnicosResponsaveis];
        const index = tecnicos.indexOf(usuarioId);

        if (index > -1) {
            tecnicos.splice(index, 1);
        } else {
            tecnicos.push(usuarioId);
        }

        setFormData(prev => ({ ...prev, tecnicosResponsaveis: tecnicos }));
    };

    // Validar CNPJ
    const validarCNPJ = (cnpj) => {
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        return cnpjLimpo.length === 14;
    };

    // Validar CEP
    const validarCEP = (cep) => {
        const cepLimpo = cep.replace(/\D/g, '');
        return cepLimpo.length === 8;
    };

    // Validar formulário
    const validateForm = () => {
        if (!formData.cnpj.trim()) {
            showMessage('CNPJ é obrigatório', 'error');
            return false;
        }

        if (!validarCNPJ(formData.cnpj)) {
            showMessage('CNPJ deve ter 14 dígitos', 'error');
            return false;
        }

        if (!formData.razao_social.trim()) {
            showMessage('Razão Social é obrigatória', 'error');
            return false;
        }

        if (formData.cep && !validarCEP(formData.cep)) {
            showMessage('CEP deve ter 8 dígitos', 'error');
            return false;
        }

        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
            showMessage('Email inválido', 'error');
            return false;
        }

        return true;
    };

    // Submeter formulário
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            // Envia os dados como JSON para o PUT/POST
            const url = `${process.env.REACT_APP_API_BASE_URL}/empresas.php`;
            const method = editingEmpresa ? 'PUT' : 'POST';

            let dataToSend = { ...formData };
            if (editingEmpresa) {
                dataToSend.id = editingEmpresa.id;
            }

            // Remove os campos que não devem ir no JSON
            delete dataToSend.logomarca;
            delete dataToSend.segmentosSelecionados;
            delete dataToSend.tecnicosResponsaveis;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Empresa-ID': '1',
                },
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Lógica para upload de imagem SE UMA NOVA IMAGEM FOI SELECIONADA
            if (result.success && formData.logomarca instanceof File) {
                const formDataFile = new FormData();
                formDataFile.append('id', result.data.id); // Pega o ID da empresa recém-criada ou atualizada
                formDataFile.append('logomarca', formData.logomarca);

                const fileResponse = await fetch(url, {
                    method: 'POST', // Usa POST para o upload do arquivo
                    headers: {
                        'X-Empresa-ID': '1',
                    },
                    body: formDataFile,
                });

                if (!fileResponse.ok) {
                    throw new Error(`Erro ao subir logomarca: HTTP error! status: ${fileResponse.status}`);
                }

                const fileResult = await fileResponse.json();
                if (!fileResult.success) {
                    throw new Error(fileResult.message || 'Erro ao salvar logomarca');
                }
            }

            showMessage(
                editingEmpresa ? 'Empresa atualizada com sucesso!' : 'Empresa criada com sucesso!',
                'success'
            );
            fetchData();
            handleCloseModal();
        } catch (error) {
            console.error('Erro ao salvar empresa:', error);
            showMessage('Erro ao salvar empresa: ' + error.message, 'error');
        }
    };

    // Excluir empresa
    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/empresas.php?id=${id}`, {
                method: 'DELETE',
                headers: { 'X-Empresa-ID': '1' }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                showMessage('Empresa excluída com sucesso!', 'success');
                fetchData();
            } else {
                throw new Error(result.message || 'Erro ao excluir empresa');
            }
        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            showMessage('Erro ao excluir empresa: ' + error.message, 'error');
        }
    };

    // Abrir modal para criar
    const handleCreate = () => {
        setEditingEmpresa(null);
        setFormData({
            cnpj: '',
            razao_social: '',
            nome_fantasia: '',
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: '',
            estado: '',
            cep: '',
            telefone: '',
            email: '',
            inscricao_municipal: '',
            inscricao_estadual: '',
            logomarca: null,
            segmentosSelecionados: [],
            tecnicosResponsaveis: [],
            custo_operacional_dia: 0,
            custo_operacional_semana: 0,
            custo_operacional_mes: 0,
            custo_operacional_ano: 0,
            ativo: 1
        });
        setLogoPreview(null);
        setShowModal(true);
    };

    // Abrir modal para editar
    const handleEdit = (empresa) => {
        setEditingEmpresa(empresa);
        setFormData({
            cnpj: empresa.cnpj || '',
            razao_social: empresa.razao_social || empresa.razao_social || '',
            nome_fantasia: empresa.nome_fantasia || empresa.nome_fantasia || '',
            logradouro: empresa.logradouro || '',
            numero: empresa.numero || '',
            bairro: empresa.bairro || '',
            cidade: empresa.cidade || '',
            estado: empresa.estado || '',
            cep: empresa.cep || '',
            telefone: empresa.telefone || '',
            email: empresa.email || '',
            inscricao_municipal: empresa.inscricao_municipal || empresa.inscricao_municipal || '',
            inscricao_estadual: empresa.inscricao_estadual || empresa.inscricao_estadual || '',
            logomarca: null,
            segmentosSelecionados: empresa.segmentos || [],
            tecnicosResponsaveis: empresa.tecnicos || [],
            custo_operacional_dia: empresa.custo_operacional_dia || empresa.custo_operacional_dia || 0,
            custo_operacional_semana: empresa.custo_operacional_semana || empresa.custo_operacional_semana || 0,
            custo_operacional_mes: empresa.custo_operacional_mes || empresa.custo_operacional_mes || 0,
            custo_operacional_ano: empresa.custo_operacional_ano || empresa.custo_operacional_ano || 0,
            ativo: empresa.ativo || 1
        });

        // Preview da logo existente
        if (empresa.logomarca) {
            const imgBaseUrl = process.env.REACT_APP_IMG_BASE_URL || 'http://localhost/Atendimentos/backend/uploads';
            setLogoPreview(`${imgBaseUrl}/logos/${empresa.logomarca}`);
        } else {
            setLogoPreview(null);
        }

        setShowModal(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEmpresa(null);
        setLogoPreview(null);
    };

    // Filtrar e ordenar dados
    const filteredEmpresas = empresas.filter(empresa =>
        (empresa.razao_social || empresa.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (empresa.nome_fantasia || empresa.nome_fantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (empresa.cnpj || '').includes(searchTerm) ||
        (empresa.cidade || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedEmpresas = [...filteredEmpresas].sort((a, b) => {
        const aValue = a[sortField] || '';
        const bValue = b[sortField] || '';

        if (sortDirection === 'asc') {
            return aValue.toString().localeCompare(bValue.toString());
        } else {
            return bValue.toString().localeCompare(aValue.toString());
        }
    });

    // Paginação
    const totalPages = Math.ceil(sortedEmpresas.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const displayedEmpresas = sortedEmpresas.slice(startIndex, startIndex + recordsPerPage);

    // Manipular ordenação
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Ícone de ordenação
    const getSortIcon = (field) => {
        if (sortField !== field) return '↕️';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    // Formatar CNPJ
    const formatCNPJ = (cnpj) => {
        if (!cnpj) return '';
        const cleaned = cnpj.replace(/\D/g, '');
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    // Formatar CEP
    const formatCEP = (cep) => {
        if (!cep) return '';
        const cleaned = cep.replace(/\D/g, '');
        return cleaned.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    };

    // Formatar moeda
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    return (
        <div className="empresas-container">
            {/* Mensagem */}
            {message.text && (
                <div className={`message ${message.type}`}>
                    <span className="message-icon">
                        {message.type === 'success' ? '✅' : '❌'}
                    </span>
                    {message.text}
                </div>
            )}

            {/* Cabeçalho */}
            <div className="empresas-header">
                <h1>🏢 Gerenciamento de Empresas</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    ➕ Nova Empresa
                </button>
            </div>

            {/* Conteúdo principal */}
            <div className="empresas-content">
                {/* Controles da tabela */}
                <div className="table-controls">
                    <div className="table-controls-left">
                        <div className="records-per-page">
                            <label htmlFor="records">Registros por página:</label>
                            <select
                                id="records"
                                value={recordsPerPage}
                                onChange={(e) => {
                                    setRecordsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>
                    <div className="table-controls-right">
                        <div className="search-box">
                            <label htmlFor="search">🔍 Buscar:</label>
                            <input
                                type="text"
                                id="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por razão social, CNPJ, cidade..."
                            />
                        </div>
                    </div>
                </div>

                {/* Tabela */}
                <div className="table-responsive">
                    <table className="empresas-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')}>
                                    ID {getSortIcon('id')}
                                </th>
                                <th onClick={() => handleSort('razao_social')}>
                                    Razão Social {getSortIcon('razao_social')}
                                </th>
                                <th onClick={() => handleSort('nome_fantasia')}>
                                    Nome Fantasia {getSortIcon('nome_fantasia')}
                                </th>
                                <th onClick={() => handleSort('cnpj')}>
                                    CNPJ {getSortIcon('cnpj')}
                                </th>
                                <th onClick={() => handleSort('cidade')}>
                                    Cidade {getSortIcon('cidade')}
                                </th>
                                <th onClick={() => handleSort('estado')}>
                                    Estado {getSortIcon('estado')}
                                </th>
                                <th onClick={() => handleSort('ativo')}>
                                    Status {getSortIcon('ativo')}
                                </th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="loading-row">
                                        <div className="loading-spinner"></div>
                                        Carregando empresas...
                                    </td>
                                </tr>
                            ) : displayedEmpresas.length > 0 ? (
                                displayedEmpresas.map((empresa) => (
                                    <tr key={empresa.id}>
                                        <td>{empresa.id}</td>
                                        <td>{empresa.razao_social || empresa.razao_social}</td>
                                        <td>{empresa.nome_fantasia || empresa.nome_fantasia}</td>
                                        <td>{formatCNPJ(empresa.cnpj)}</td>
                                        <td>{empresa.cidade}</td>
                                        <td>{empresa.estado}</td>
                                        <td>
                                            <span className={`status-badge ${empresa.ativo ? 'ativo' : 'inativo'}`}>
                                                {empresa.ativo ? '✅ Ativo' : '❌ Inativo'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEdit(empresa)}
                                                title="Editar empresa"
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(empresa.id)}
                                                title="Excluir empresa"
                                            >
                                                🗑️ Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="no-records-found">
                                        {searchTerm ? '🔍 Nenhuma empresa encontrada para a busca.' : '📋 Nenhuma empresa cadastrada.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                <div className="pagination">
                    <div className="pagination-info">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + recordsPerPage, sortedEmpresas.length)} de {sortedEmpresas.length} registros
                        {searchTerm && ` (filtrados de ${empresas.length} total)`}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                className="btn-pagination"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                            >
                                ⏮️ Primeiro
                            </button>
                            <button
                                className="btn-pagination"
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                ⬅️ Anterior
                            </button>

                            <span className="page-info">
                                Página {currentPage} de {totalPages}
                            </span>

                            <button
                                className="btn-pagination"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Próxima ➡️
                            </button>
                            <button
                                className="btn-pagination"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                Último ⏭️
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {editingEmpresa ? '✏️ Editar Empresa' : '➕ Nova Empresa'}
                            </h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-sections">
                                {/* Seção: Dados Principais */}
                                <div className="form-section">
                                    <h3 className="section-title">📋 Dados Principais</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="cnpj">
                                                CNPJ <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="cnpj"
                                                name="cnpj"
                                                value={formData.cnpj}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="00.000.000/0000-00"
                                                maxLength="18"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="razao_social">
                                                Razão Social <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="razao_social"
                                                name="razao_social"
                                                value={formData.razao_social}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Digite a razão social"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="nome_fantasia">Nome Fantasia</label>
                                            <input
                                                type="text"
                                                id="nome_fantasia"
                                                name="nome_fantasia"
                                                value={formData.nome_fantasia}
                                                onChange={handleInputChange}
                                                placeholder="Digite o nome fantasia"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="inscricao_municipal">Inscrição Municipal</label>
                                            <input
                                                type="text"
                                                id="inscricao_municipal"
                                                name="inscricao_municipal"
                                                value={formData.inscricao_municipal}
                                                onChange={handleInputChange}
                                                placeholder="Digite a inscrição municipal"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="inscricao_estadual">Inscrição Estadual</label>
                                            <input
                                                type="text"
                                                id="inscricao_estadual"
                                                name="inscricao_estadual"
                                                value={formData.inscricao_estadual}
                                                onChange={handleInputChange}
                                                placeholder="Digite a inscrição estadual"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="ativo">Status</label>
                                            <select
                                                id="ativo"
                                                name="ativo"
                                                value={formData.ativo}
                                                onChange={handleInputChange}
                                            >
                                                <option value={1}>✅ Ativo</option>
                                                <option value={0}>❌ Inativo</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Seção: Endereço */}
                                <div className="form-section">
                                    <h3 className="section-title">📍 Endereço</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="logradouro">Logradouro</label>
                                            <input
                                                type="text"
                                                id="logradouro"
                                                name="logradouro"
                                                value={formData.logradouro}
                                                onChange={handleInputChange}
                                                placeholder="Rua, Avenida, etc."
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="numero">Número</label>
                                            <input
                                                type="text"
                                                id="numero"
                                                name="numero"
                                                value={formData.numero}
                                                onChange={handleInputChange}
                                                placeholder="123"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="bairro">Bairro</label>
                                            <input
                                                type="text"
                                                id="bairro"
                                                name="bairro"
                                                value={formData.bairro}
                                                onChange={handleInputChange}
                                                placeholder="Digite o bairro"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="cidade">Cidade</label>
                                            <input
                                                type="text"
                                                id="cidade"
                                                name="cidade"
                                                value={formData.cidade}
                                                onChange={handleInputChange}
                                                placeholder="Digite a cidade"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="estado">Estado</label>
                                            <select
                                                id="estado"
                                                name="estado"
                                                value={formData.estado}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Selecione o estado</option>
                                                {estados.map(estado => (
                                                    <option key={estado} value={estado}>{estado}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="cep">CEP</label>
                                            <input
                                                type="text"
                                                id="cep"
                                                name="cep"
                                                value={formData.cep}
                                                onChange={handleInputChange}
                                                placeholder="00000-000"
                                                maxLength="9"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção: Contato */}
                                <div className="form-section">
                                    <h3 className="section-title">📞 Contato</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="telefone">Telefone</label>
                                            <input
                                                type="text"
                                                id="telefone"
                                                name="telefone"
                                                value={formData.telefone}
                                                onChange={handleInputChange}
                                                placeholder="(11) 99999-9999"
                                                maxLength="15"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="email">Email</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="contato@empresa.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção: Logomarca */}
                                <div className="form-section">
                                    <h3 className="section-title">🖼️ Logomarca</h3>
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label htmlFor="logomarca">Logomarca da Empresa</label>
                                            <input
                                                type="file"
                                                id="logomarca"
                                                name="logomarca"
                                                accept="image/*"
                                                onChange={handleInputChange}
                                                className="file-input"
                                            />
                                            <small className="file-help">
                                                Formatos aceitos: JPG, PNG, GIF (máx. 2MB)
                                            </small>

                                            {logoPreview && (
                                                <div className="logo-preview">
                                                    <img src={logoPreview} alt="Preview da logo" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Seção: Segmentos */}
                                <div className="form-section">
                                    <h3 className="section-title">🏷️ Segmentos de Atuação</h3>
                                    <div className="checkbox-grid">
                                        {segmentos.map(segmento => (
                                            <label key={segmento.id} className="checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.segmentosSelecionados.includes(segmento.id)}
                                                    onChange={() => handleSegmentosChange(segmento.id)}
                                                />
                                                <span className="checkbox-label">{segmento.nome}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Seção: Técnicos Responsáveis */}
                                <div className="form-section">
                                    <h3 className="section-title">👥 Técnicos Responsáveis</h3>
                                    <div className="checkbox-grid">
                                        {usuarios.map(usuario => (
                                            <label key={usuario.id} className="checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.tecnicosResponsaveis.includes(usuario.id)}
                                                    onChange={() => handleTecnicosChange(usuario.id)}
                                                />
                                                <span className="checkbox-label">
                                                    {usuario.nome} ({usuario.email})
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Seção: Custos Operacionais */}
                                <div className="form-section">
                                    <h3 className="section-title">💰 Custos Operacionais</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="custo_operacional_dia">
                                                Custo Operacional/Dia <span className="required">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                id="custo_operacional_dia"
                                                name="custo_operacional_dia"
                                                value={formData.custo_operacional_dia}
                                                onChange={handleInputChange}
                                                step="0.01"
                                                min="0"
                                                placeholder="0,00"
                                            />
                                            <small className="field-help">
                                                Base para cálculo dos demais períodos
                                            </small>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="custo_operacional_semana">Custo Operacional/Semana</label>
                                            <input
                                                type="number"
                                                id="custo_operacional_semana"
                                                name="custo_operacional_semana"
                                                value={formData.custo_operacional_semana}
                                                step="0.01"
                                                min="0"
                                                readOnly
                                                className="readonly-field"
                                            />
                                            <small className="field-help">
                                                Calculado automaticamente (Dia × 5)
                                            </small>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="custo_operacional_mes">Custo Operacional/Mês</label>
                                            <input
                                                type="number"
                                                id="custo_operacional_mes"
                                                name="custo_operacional_mes"
                                                value={formData.custo_operacional_mes}
                                                step="0.01"
                                                min="0"
                                                readOnly
                                                className="readonly-field"
                                            />
                                            <small className="field-help">
                                                Calculado automaticamente (Dia × 30)
                                            </small>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="custo_operacional_ano">Custo Operacional/Ano</label>
                                            <input
                                                type="number"
                                                id="custo_operacional_ano"
                                                name="custo_operacional_ano"
                                                value={formData.custo_operacional_ano}
                                                step="0.01"
                                                min="0"
                                                readOnly
                                                className="readonly-field"
                                            />
                                            <small className="field-help">
                                                Calculado automaticamente (Dia × 365)
                                            </small>
                                        </div>
                                    </div>

                                    {/* Resumo dos custos */}
                                    <div className="custos-resumo">
                                        <h4>📊 Resumo dos Custos</h4>
                                        <div className="resumo-grid">
                                            <div className="resumo-item">
                                                <span>Diário:</span>
                                                <strong>{formatCurrency(formData.custo_operacional_dia)}</strong>
                                            </div>
                                            <div className="resumo-item">
                                                <span>Semanal:</span>
                                                <strong>{formatCurrency(formData.custo_operacional_semana)}</strong>
                                            </div>
                                            <div className="resumo-item">
                                                <span>Mensal:</span>
                                                <strong>{formatCurrency(formData.custo_operacional_mes)}</strong>
                                            </div>
                                            <div className="resumo-item">
                                                <span>Anual:</span>
                                                <strong>{formatCurrency(formData.custo_operacional_ano)}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleCloseModal}
                                >
                                    ❌ Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    {editingEmpresa ? '💾 Atualizar' : '💾 Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmpresasCompleto;

