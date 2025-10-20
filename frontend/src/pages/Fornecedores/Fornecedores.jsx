import React, { useState, useEffect } from 'react';
import { fornecedoresAPI } from '../../utils/api';
import './Fornecedores.css';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaBuilding, FaUser, FaSpinner } from 'react-icons/fa';

const Fornecedores = () => {
    const [fornecedores, setFornecedores] = useState([]);
    const [fornecedoresFiltrados, setFornecedoresFiltrados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(false);
    const [buscandoDados, setBuscandoDados] = useState(false);
    
    // Controles da tabela
    const [busca, setBusca] = useState('');
    const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
    
    // Mensagens
    const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
    
    // Formulário
    const [formData, setFormData] = useState({
        id: null,
        tipo_pessoa: 'juridica', // 'juridica' ou 'fisica'
        cpf_cnpj: '',
        nome: '',
        razao_social: '',
        nome_fantasia: '',
        inscricao_estadual: '',
        inscricao_municipal: '',
        email: '',
        telefone: '',
        celular: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        observacoes: '',
        ativo: true
    });

    useEffect(() => {
        carregarFornecedores();
    }, []);

    useEffect(() => {
        filtrarFornecedores();
    }, [busca, fornecedores]);

    const carregarFornecedores = async () => {
        try {
            setLoading(true);
            const empresaId = localStorage.getItem('empresa_id');
            const response = await fornecedoresAPI.listar({ empresaId });
            
            if (response.data.sucesso) {
                setFornecedores(response.data.data || []);
            }
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
            mostrarMensagem('error', 'Erro ao carregar fornecedores');
        } finally {
            setLoading(false);
        }
    };

    const filtrarFornecedores = () => {
        if (!busca.trim()) {
            setFornecedoresFiltrados(fornecedores);
            return;
        }

        const termo = busca.toLowerCase();
        const filtrados = fornecedores.filter(f => 
            f.nome?.toLowerCase().includes(termo) ||
            f.razao_social?.toLowerCase().includes(termo) ||
            f.nome_fantasia?.toLowerCase().includes(termo) ||
            f.cpf_cnpj?.includes(termo) ||
            f.email?.toLowerCase().includes(termo) ||
            f.telefone?.includes(termo)
        );
        setFornecedoresFiltrados(filtrados);
    };

    const abrirModal = (fornecedor = null) => {
        if (fornecedor) {
            setFormData({
                ...fornecedor,
                ativo: fornecedor.ativo === 1 || fornecedor.ativo === true
            });
            setEditando(true);
        } else {
            resetarFormulario();
            setEditando(false);
        }
        setShowModal(true);
    };

    const fecharModal = () => {
        setShowModal(false);
        resetarFormulario();
    };

    const resetarFormulario = () => {
        setFormData({
            id: null,
            tipo_pessoa: 'juridica',
            cpf_cnpj: '',
            nome: '',
            razao_social: '',
            nome_fantasia: '',
            inscricao_estadual: '',
            inscricao_municipal: '',
            email: '',
            telefone: '',
            celular: '',
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
            observacoes: '',
            ativo: true
        });
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTipoPessoaChange = (tipo) => {
        setFormData(prev => ({
            ...prev,
            tipo_pessoa: tipo,
            cpf_cnpj: '',
            razao_social: '',
            nome_fantasia: '',
            inscricao_estadual: '',
            inscricao_municipal: ''
        }));
    };

    // Buscar dados por CNPJ (ReceitaWS)
    const buscarDadosCNPJ = async () => {
        const cnpj = formData.cpf_cnpj.replace(/\D/g, '');
        
        if (cnpj.length !== 14) {
            mostrarMensagem('error', 'CNPJ deve ter 14 dígitos');
            return;
        }

        try {
            setBuscandoDados(true);
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            
            if (!response.ok) {
                throw new Error('CNPJ não encontrado');
            }

            const dados = await response.json();
            
            setFormData(prev => ({
                ...prev,
                razao_social: dados.razao_social || '',
                nome_fantasia: dados.nome_fantasia || dados.razao_social || '',
                nome: dados.nome_fantasia || dados.razao_social || '',
                email: dados.email || '',
                telefone: dados.ddd_telefone_1 ? `(${dados.ddd_telefone_1.substring(0,2)}) ${dados.ddd_telefone_1.substring(2)}` : '',
                cep: dados.cep ? dados.cep.replace(/\D/g, '') : '',
                logradouro: dados.logradouro || '',
                numero: dados.numero || '',
                complemento: dados.complemento || '',
                bairro: dados.bairro || '',
                cidade: dados.municipio || '',
                estado: dados.uf || ''
            }));

            mostrarMensagem('success', 'Dados do CNPJ carregados com sucesso!');
        } catch (error) {
            console.error('Erro ao buscar CNPJ:', error);
            mostrarMensagem('error', 'Erro ao buscar dados do CNPJ. Verifique o número digitado.');
        } finally {
            setBuscandoDados(false);
        }
    };

    // Buscar dados por CPF (API pública - simulação, pois não há API gratuita de CPF)
    const buscarDadosCPF = async () => {
        const cpf = formData.cpf_cnpj.replace(/\D/g, '');
        
        if (cpf.length !== 11) {
            mostrarMensagem('error', 'CPF deve ter 11 dígitos');
            return;
        }

        // Validação básica de CPF
        if (!validarCPF(cpf)) {
            mostrarMensagem('error', 'CPF inválido');
            return;
        }

        mostrarMensagem('success', 'CPF válido! Preencha os demais dados manualmente.');
    };

    // Validação de CPF
    const validarCPF = (cpf) => {
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        
        let soma = 0;
        let resto;
        
        for (let i = 1; i <= 9; i++) {
            soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        
        soma = 0;
        for (let i = 1; i <= 10; i++) {
            soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        
        return true;
    };

    // Buscar CEP
    const buscarCEP = async () => {
        const cep = formData.cep.replace(/\D/g, '');
        
        if (cep.length !== 8) {
            mostrarMensagem('error', 'CEP deve ter 8 dígitos');
            return;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const dados = await response.json();
            
            if (dados.erro) {
                mostrarMensagem('error', 'CEP não encontrado');
                return;
            }

            setFormData(prev => ({
                ...prev,
                logradouro: dados.logradouro || '',
                bairro: dados.bairro || '',
                cidade: dados.localidade || '',
                estado: dados.uf || ''
            }));

            mostrarMensagem('success', 'CEP encontrado!');
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            mostrarMensagem('error', 'Erro ao buscar CEP');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validações
        if (!formData.cpf_cnpj.trim()) {
            mostrarMensagem('error', 'CPF/CNPJ é obrigatório');
            return;
        }

        if (!formData.nome.trim()) {
            mostrarMensagem('error', 'Nome é obrigatório');
            return;
        }

        try {
            const empresaId = localStorage.getItem('empresa_id');
            const dados = {
                ...formData,
                empresa_id: empresaId,
                ativo: formData.ativo ? 1 : 0
            };

            let response;
            if (editando) {
                response = await fornecedoresAPI.atualizar(formData.id, dados);
            } else {
                response = await fornecedoresAPI.criar(dados);
            }

            if (response.data.sucesso) {
                mostrarMensagem('success', editando ? 'Fornecedor atualizado com sucesso!' : 'Fornecedor cadastrado com sucesso!');
                fecharModal();
                carregarFornecedores();
            }
        } catch (error) {
            console.error('Erro ao salvar fornecedor:', error);
            mostrarMensagem('error', 'Erro ao salvar fornecedor');
        }
    };

    const excluirFornecedor = async (id) => {
        if (!window.confirm('Deseja realmente excluir este fornecedor?')) {
            return;
        }

        try {
            const empresaId = localStorage.getItem('empresa_id');
            const response = await fornecedoresAPI.excluir(id, empresaId);
            
            if (response.data.sucesso) {
                mostrarMensagem('success', 'Fornecedor excluído com sucesso!');
                carregarFornecedores();
            }
        } catch (error) {
            console.error('Erro ao excluir fornecedor:', error);
            mostrarMensagem('error', 'Erro ao excluir fornecedor');
        }
    };

    const mostrarMensagem = (tipo, texto) => {
        setMensagem({ tipo, texto });
        setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
    };

    const formatarCPFCNPJ = (valor) => {
        const numeros = valor.replace(/\D/g, '');
        
        if (numeros.length <= 11) {
            // CPF: 000.000.000-00
            return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else {
            // CNPJ: 00.000.000/0000-00
            return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
    };

    const formatarTelefone = (valor) => {
        const numeros = valor.replace(/\D/g, '');
        
        if (numeros.length <= 10) {
            return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else {
            return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <FaSpinner className="spinner" /> Carregando fornecedores...
            </div>
        );
    }

    return (
        <div className="fornecedores-container">
            {/* Mensagem */}
            {mensagem.texto && (
                <div className={`message ${mensagem.tipo}`}>
                    <span className="message-icon">
                        {mensagem.tipo === 'success' ? '✓' : '✕'}
                    </span>
                    {mensagem.texto}
                </div>
            )}

            {/* Cabeçalho */}
            <div className="fornecedores-header">
                <div>
                    <h1>Fornecedores</h1>
                    <p className="header-subtitle">Gerencie seus fornecedores de produtos e serviços</p>
                </div>
                <button className="btn-primary" onClick={() => abrirModal()}>
                    <FaPlus /> Novo Fornecedor
                </button>
            </div>

            {/* Cards Informativos */}
            <div className="info-cards">
                <div className="info-card">
                    <div className="info-icon" style={{ color: '#0891b2' }}>
                        <FaBuilding />
                    </div>
                    <div className="info-content">
                        <h3>Total de Fornecedores</h3>
                        <p className="info-value">{fornecedores.length}</p>
                    </div>
                </div>
                <div className="info-card">
                    <div className="info-icon" style={{ color: '#10b981' }}>
                        <FaUser />
                    </div>
                    <div className="info-content">
                        <h3>Fornecedores Ativos</h3>
                        <p className="info-value">{fornecedores.filter(f => f.ativo).length}</p>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="fornecedores-content">
                {/* Controles da Tabela */}
                <div className="table-controls">
                    <div className="control-group">
                        <div className="records-per-page">
                            <label>Mostrar</label>
                            <select value={registrosPorPagina} onChange={(e) => setRegistrosPorPagina(Number(e.target.value))}>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <label>registros</label>
                        </div>
                    </div>
                    <div className="search-box">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Buscar por nome, CNPJ, e-mail..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                </div>

                {/* Tabela */}
                <div className="table-responsive">
                    <table className="fornecedores-table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>CPF/CNPJ</th>
                                <th>Nome/Razão Social</th>
                                <th>Nome Fantasia</th>
                                <th>Telefone</th>
                                <th>E-mail</th>
                                <th>Cidade/UF</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fornecedoresFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="no-records-found">
                                        Nenhum fornecedor encontrado
                                    </td>
                                </tr>
                            ) : (
                                fornecedoresFiltrados.slice(0, registrosPorPagina).map(fornecedor => (
                                    <tr key={fornecedor.id}>
                                        <td>
                                            <span className={`badge badge-${fornecedor.tipo_pessoa}`}>
                                                {fornecedor.tipo_pessoa === 'juridica' ? (
                                                    <><FaBuilding /> PJ</>
                                                ) : (
                                                    <><FaUser /> PF</>
                                                )}
                                            </span>
                                        </td>
                                        <td>{formatarCPFCNPJ(fornecedor.cpf_cnpj || '')}</td>
                                        <td>{fornecedor.tipo_pessoa === 'juridica' ? fornecedor.razao_social : fornecedor.nome}</td>
                                        <td>{fornecedor.nome_fantasia || '-'}</td>
                                        <td>{fornecedor.telefone || '-'}</td>
                                        <td>{fornecedor.email || '-'}</td>
                                        <td>{fornecedor.cidade ? `${fornecedor.cidade}/${fornecedor.estado}` : '-'}</td>
                                        <td>
                                            <span className={`status-badge ${fornecedor.ativo ? 'ativo' : 'inativo'}`}>
                                                {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button className="btn-edit" onClick={() => abrirModal(fornecedor)}>
                                                <FaEdit /> Editar
                                            </button>
                                            <button className="btn-delete" onClick={() => excluirFornecedor(fornecedor.id)}>
                                                <FaTrash /> Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Info da Tabela */}
                <div className="table-info">
                    Mostrando {Math.min(fornecedoresFiltrados.length, registrosPorPagina)} de {fornecedoresFiltrados.length} registros
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editando ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
                            <button className="modal-close" onClick={fecharModal}>×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-sections">
                                {/* Tipo de Pessoa */}
                                <div className="form-section">
                                    <h3>Tipo de Pessoa</h3>
                                    <div className="tipo-pessoa-buttons">
                                        <button
                                            type="button"
                                            className={`tipo-btn ${formData.tipo_pessoa === 'juridica' ? 'active' : ''}`}
                                            onClick={() => handleTipoPessoaChange('juridica')}
                                        >
                                            <FaBuilding /> Pessoa Jurídica
                                        </button>
                                        <button
                                            type="button"
                                            className={`tipo-btn ${formData.tipo_pessoa === 'fisica' ? 'active' : ''}`}
                                            onClick={() => handleTipoPessoaChange('fisica')}
                                        >
                                            <FaUser /> Pessoa Física
                                        </button>
                                    </div>
                                </div>

                                {/* Dados Principais */}
                                <div className="form-section">
                                    <h3>Dados Principais</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>{formData.tipo_pessoa === 'juridica' ? 'CNPJ *' : 'CPF *'}</label>
                                            <div className="input-with-button">
                                                <input
                                                    type="text"
                                                    name="cpf_cnpj"
                                                    value={formData.cpf_cnpj}
                                                    onChange={handleInputChange}
                                                    placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                                                    maxLength={formData.tipo_pessoa === 'juridica' ? 18 : 14}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-generate"
                                                    onClick={formData.tipo_pessoa === 'juridica' ? buscarDadosCNPJ : buscarDadosCPF}
                                                    disabled={buscandoDados}
                                                >
                                                    {buscandoDados ? <FaSpinner className="spinner" /> : <FaSearch />}
                                                    {buscandoDados ? 'Buscando...' : 'Buscar'}
                                                </button>
                                            </div>
                                        </div>

                                        {formData.tipo_pessoa === 'juridica' ? (
                                            <>
                                                <div className="form-group">
                                                    <label>Razão Social *</label>
                                                    <input
                                                        type="text"
                                                        name="razao_social"
                                                        value={formData.razao_social}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Nome Fantasia</label>
                                                    <input
                                                        type="text"
                                                        name="nome_fantasia"
                                                        value={formData.nome_fantasia}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Inscrição Estadual</label>
                                                    <input
                                                        type="text"
                                                        name="inscricao_estadual"
                                                        value={formData.inscricao_estadual}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Inscrição Municipal</label>
                                                    <input
                                                        type="text"
                                                        name="inscricao_municipal"
                                                        value={formData.inscricao_municipal}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="form-group">
                                                <label>Nome Completo *</label>
                                                <input
                                                    type="text"
                                                    name="nome"
                                                    value={formData.nome}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Contato */}
                                <div className="form-section">
                                    <h3>Contato</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>E-mail</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Telefone</label>
                                            <input
                                                type="text"
                                                name="telefone"
                                                value={formData.telefone}
                                                onChange={handleInputChange}
                                                placeholder="(00) 0000-0000"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Celular</label>
                                            <input
                                                type="text"
                                                name="celular"
                                                value={formData.celular}
                                                onChange={handleInputChange}
                                                placeholder="(00) 00000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Endereço */}
                                <div className="form-section">
                                    <h3>Endereço</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>CEP</label>
                                            <div className="input-with-button">
                                                <input
                                                    type="text"
                                                    name="cep"
                                                    value={formData.cep}
                                                    onChange={handleInputChange}
                                                    placeholder="00000-000"
                                                    maxLength={9}
                                                />
                                                <button type="button" className="btn-generate" onClick={buscarCEP}>
                                                    <FaSearch /> Buscar
                                                </button>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Logradouro</label>
                                            <input
                                                type="text"
                                                name="logradouro"
                                                value={formData.logradouro}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Número</label>
                                            <input
                                                type="text"
                                                name="numero"
                                                value={formData.numero}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Complemento</label>
                                            <input
                                                type="text"
                                                name="complemento"
                                                value={formData.complemento}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Bairro</label>
                                            <input
                                                type="text"
                                                name="bairro"
                                                value={formData.bairro}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Cidade</label>
                                            <input
                                                type="text"
                                                name="cidade"
                                                value={formData.cidade}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Estado</label>
                                            <select name="estado" value={formData.estado} onChange={handleInputChange}>
                                                <option value="">Selecione...</option>
                                                <option value="AC">Acre</option>
                                                <option value="AL">Alagoas</option>
                                                <option value="AP">Amapá</option>
                                                <option value="AM">Amazonas</option>
                                                <option value="BA">Bahia</option>
                                                <option value="CE">Ceará</option>
                                                <option value="DF">Distrito Federal</option>
                                                <option value="ES">Espírito Santo</option>
                                                <option value="GO">Goiás</option>
                                                <option value="MA">Maranhão</option>
                                                <option value="MT">Mato Grosso</option>
                                                <option value="MS">Mato Grosso do Sul</option>
                                                <option value="MG">Minas Gerais</option>
                                                <option value="PA">Pará</option>
                                                <option value="PB">Paraíba</option>
                                                <option value="PR">Paraná</option>
                                                <option value="PE">Pernambuco</option>
                                                <option value="PI">Piauí</option>
                                                <option value="RJ">Rio de Janeiro</option>
                                                <option value="RN">Rio Grande do Norte</option>
                                                <option value="RS">Rio Grande do Sul</option>
                                                <option value="RO">Rondônia</option>
                                                <option value="RR">Roraima</option>
                                                <option value="SC">Santa Catarina</option>
                                                <option value="SP">São Paulo</option>
                                                <option value="SE">Sergipe</option>
                                                <option value="TO">Tocantins</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Observações */}
                                <div className="form-section">
                                    <h3>Observações</h3>
                                    <div className="form-group-full">
                                        <textarea
                                            name="observacoes"
                                            value={formData.observacoes}
                                            onChange={handleInputChange}
                                            rows="4"
                                            placeholder="Informações adicionais sobre o fornecedor..."
                                        />
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="form-section">
                                    <div className="form-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="ativo"
                                                checked={formData.ativo}
                                                onChange={handleInputChange}
                                            />
                                            Fornecedor Ativo
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Ações do Modal */}
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={fecharModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editando ? 'Atualizar' : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Fornecedores;

