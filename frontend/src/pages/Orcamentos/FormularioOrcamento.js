import React, { useState, useEffect, useRef } from 'react';
import {
    Building2, Users, Calendar, Calculator, FileText, Plus, Trash2, Upload,
    Image, Wrench, Package, Save, X, CheckCircle, Edit
} from 'lucide-react';
import toast from 'react-hot-toast';
import './FormularioOrcamento.css';

const FormularioOrcamentoExpandido = ({ orcamento, empresas, clientes, onSave, onCancel }) => {
    const [clientesFiltrados, setClientesFiltrados] = useState([]);
    // Estados do formulário principal
    const [formData, setFormData] = useState({
        numero_orcamento: '',
        empresa_id: '',
        cliente_id: '',
        clienteBusca: '',
        referencia: '',
        data_orcamento: new Date().toISOString().split('T')[0],
        validade_orcamento: '',
        prazo_inicio: '',
        prazo_duracao: '',
        observacoes: '',
        imposto_percentual: 0,
        frete: 0,
        desconto_valor: 0,
        desconto_percentual: 0,
        tipo_desconto: 'valor',
        condicoes_pagamento: '',
        meios_pagamento: '',
        anotacoes_internas: '',
        status: 'rascunho',
    });

    // Estados para serviços
    const [servicos, setServicos] = useState([{
        id: Date.now(),
        servico: '',
        detalhes: '',
        preco_unitario: 0,
        quantidade: 1,
        desconto: 0,
        valor_total: 0
    }]);

    // Estados para materiais
    const [materiais, setMateriais] = useState([{
        id: Date.now(),
        material: '',
        detalhes: '',
        preco_unitario: 0,
        quantidade: 1,
        desconto: 0,
        valor_total: 0
    }]);

    // Estados para fotos
    const [fotosNovas, setFotosNovas] = useState([]); // Arquivos File para upload
    const [fotosExistentes, setFotosExistentes] = useState([]); // URLs de fotos já salvas
    const [fotosPreview, setFotosPreview] = useState([]); // URLs para pré-visualização (novas e existentes)

    // Variáveis de ambiente para URLs de imagens
    const IMG_BASE_URL = process.env.REACT_APP_IMG_BASE_URL;


    // Estados de controle
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [errors, setErrors] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [initialFormState, setInitialFormState] = useState(null);

    // CORREÇÃO: Refs para controle robusto de submissões
    const isSubmittingRef = useRef(false);
    const submitTimeoutRef = useRef(null);

    // NOVA FUNÇÃO: Prevenção robusta de múltiplas submissões
    const preventMultipleSubmissions = () => {
        if (isSubmittingRef.current) {
            console.log('⚠️ Submissão bloqueada - já em andamento');
            return false;
        }

        isSubmittingRef.current = true;
        setSubmitting(true);

        // Timeout de segurança para liberar após 30 segundos
        submitTimeoutRef.current = setTimeout(() => {
            console.log('⏰ Timeout de submissão - liberando');
            isSubmittingRef.current = false;
            setSubmitting(false);
        }, 30000);

        return true;
    };

    // NOVA FUNÇÃO: Liberar submissão
    const releaseSubmission = () => {
        isSubmittingRef.current = false;
        setSubmitting(false);

        if (submitTimeoutRef.current) {
            clearTimeout(submitTimeoutRef.current);
            submitTimeoutRef.current = null;
        }
    };

    // Cleanup no unmount
    useEffect(() => {
        return () => {
            if (submitTimeoutRef.current) {
                clearTimeout(submitTimeoutRef.current);
            }
        };
    }, []);

    // Calcular valores totais
    const calcularTotais = () => {
        const subtotalServicos = servicos.reduce((acc, servico) => acc + servico.valor_total, 0);
        const subtotalMateriais = materiais.reduce((acc, material) => acc + material.valor_total, 0);
        const subtotal = subtotalServicos + subtotalMateriais;

        const valorImposto = (subtotal * formData.imposto_percentual) / 100;
        const valorFrete = parseFloat(formData.frete) || 0;

        let valorDesconto = 0;
        if (formData.tipo_desconto === 'valor') {
            valorDesconto = parseFloat(formData.desconto_valor) || 0;
        } else {
            valorDesconto = (subtotal * parseFloat(formData.desconto_percentual)) / 100;
        }

        const valorTotal = subtotal + valorImposto + valorFrete - valorDesconto;

        return {
            subtotalServicos,
            subtotalMateriais,
            subtotal,
            valorImposto,
            valorFrete,
            valorDesconto,
            valorTotal: Math.max(0, valorTotal)
        };
    };

    useEffect(() => {

        if (formData.data_orcamento) {
            const dataOrcamento = new Date(formData.data_orcamento);
            dataOrcamento.setDate(dataOrcamento.getDate() + 5);

            const novaValidade = dataOrcamento.toISOString().split('T')[0];

            setFormData(prev => ({ ...prev, validade_orcamento: novaValidade }));
        }
    }, [formData.data_orcamento]);

    // Inicializar dados se editando
    useEffect(() => {
        if (orcamento && orcamento.id) {
            console.log('Orçamento recebido para edição:', orcamento);

            const clienteEncontrado = clientes.find(c => c.id === orcamento.cliente_id);

            const dadosIniciais = {
                ...formData,
                ...orcamento,
                cliente_id: orcamento.cliente_id || '',
                clienteBusca: clienteEncontrado
                    ? (clienteEncontrado.nome_fantasia || clienteEncontrado.razao_social || clienteEncontrado.nome)
                    : '',
                data_orcamento: orcamento.data_orcamento?.split(' ')[0] || new Date().toISOString().split('T')[0],
                validade_orcamento: orcamento.validade_orcamento?.split(' ')[0] || '',
                prazo_inicio: orcamento.prazo_inicio?.split(' ')[0] || ''
            };
            setFormData(dadosIniciais);

            let servicosCarregados = [];
            if (orcamento.servicos && Array.isArray(orcamento.servicos)) {
                servicosCarregados = orcamento.servicos.map(item => ({
                    id: item.id,
                    servico: item.descricao || '',
                    detalhes: item.observacao || '',
                    preco_unitario: parseFloat(item.valor_unitario) || 0,
                    quantidade: parseFloat(item.quantidade) || 1,
                    desconto: 0,
                    valor_total: parseFloat(item.valor_total) || 0
                }));
            }

            setServicos(servicosCarregados.length > 0 ? servicosCarregados : [{ id: Date.now(), servico: '', detalhes: '', preco_unitario: 0, quantidade: 1, desconto: 0, valor_total: 0 }]);

            let materiaisCarregados = [];
            if (orcamento.materiais && Array.isArray(orcamento.materiais)) {
                materiaisCarregados = orcamento.materiais.map(item => ({
                    id: item.id,
                    material: item.descricao || '',
                    detalhes: item.observacao || '',
                    preco_unitario: parseFloat(item.valor_unitario) || 0,
                    quantidade: parseFloat(item.quantidade) || 1,
                    desconto: 0,
                    valor_total: parseFloat(item.valor_total) || 0
                }));
            }
            setMateriais(materiaisCarregados.length > 0 ? materiaisCarregados : [{ id: Date.now(), material: '', detalhes: '', preco_unitario: 0, quantidade: 1, desconto: 0, valor_total: 0 }]);

            // Carregar fotos existentes
            let fotosExistentesCarregadas = [];
            if (orcamento.fotos && Array.isArray(orcamento.fotos)) {
                fotosExistentesCarregadas = orcamento.fotos.map(foto => ({
                    id: foto.id,
                    url: `${IMG_BASE_URL}/${foto.caminho}`,
                    name: foto.nome_arquivo || `foto-${foto.id}`
                }));
            }
            setFotosExistentes(fotosExistentesCarregadas);
            setFotosPreview([...fotosExistentesCarregadas]);

            setInitialFormState(JSON.stringify({
                formData: dadosIniciais,
                servicos: servicosCarregados,
                materiais: materiaisCarregados,
                fotosExistentes: fotosExistentesCarregadas
            }));
        }
    }, [orcamento]);

    useEffect(() => {
        if (initialFormState) {
            const currentState = JSON.stringify({
                formData,
                servicos,
                materiais,
                fotosExistentes
            });
            setHasUnsavedChanges(currentState !== initialFormState);
        }
    }, [formData, servicos, materiais, initialFormState]);

    useEffect(() => {
        const totais = calcularTotais();
        setFormData(prev => ({ ...prev, valor_total: totais.valorTotal }));
    }, [servicos, materiais, formData.imposto_percentual, formData.frete, formData.desconto_valor, formData.desconto_percentual, formData.tipo_desconto]);


    const adicionarServico = () => {
        setServicos([...servicos, {
            id: Date.now(),
            servico: '',
            detalhes: '',
            preco_unitario: 0,
            quantidade: 1,
            desconto: 0,
            valor_total: 0
        }]);
    };

    const removerServico = (id) => {
        if (servicos.length > 1) {
            setServicos(servicos.filter(s => s.id !== id));
        }
    };

    const atualizarServico = (id, campo, valor) => {
        setServicos(servicos.map(servico => {
            if (servico.id === id) {
                const servicoAtualizado = { ...servico, [campo]: valor };

                if (campo === 'preco_unitario' || campo === 'quantidade' || campo === 'desconto') {
                    const preco = parseFloat(servicoAtualizado.preco_unitario) || 0;
                    const qtd = parseFloat(servicoAtualizado.quantidade) || 1;
                    const desc = parseFloat(servicoAtualizado.desconto) || 0;
                    servicoAtualizado.valor_total = (preco * qtd) - desc;
                }

                return servicoAtualizado;
            }
            return servico;
        }));
    };

    const adicionarMaterial = () => {
        setMateriais([...materiais, {
            id: Date.now(),
            material: '',
            detalhes: '',
            preco_unitario: 0,
            quantidade: 1,
            desconto: 0,
            valor_total: 0
        }]);
    };

    const removerMaterial = (id) => {
        if (materiais.length > 1) {
            setMateriais(materiais.filter(m => m.id !== id));
        }
    };

    const atualizarMaterial = (id, campo, valor) => {
        setMateriais(materiais.map(material => {
            if (material.id === id) {
                const materialAtualizado = { ...material, [campo]: valor };

                if (campo === 'preco_unitario' || campo === 'quantidade' || campo === 'desconto') {
                    const preco = parseFloat(materialAtualizado.preco_unitario) || 0;
                    const qtd = parseFloat(materialAtualizado.quantidade) || 1;
                    const desc = parseFloat(materialAtualizado.desconto) || 0;
                    materialAtualizado.valor_total = (preco * qtd) - desc;
                }

                return materialAtualizado;
            }
            return material;
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFotosNovas(prev => [...prev, ...files]);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setFotosPreview(prev => [...prev, {
                    id: `new-${Date.now() + Math.random()}`,
                    url: e.target.result,
                    name: file.name,
                    fileObject: file // Armazenar o objeto File para remoção de novas fotos
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removerFoto = (id) => {
        // Se for uma foto nova (id começa com 'new-'), remove de fotosNovas
        if (String(id).startsWith('new-')) {
            const fotoRemover = fotosPreview.find(foto => foto.id === id);
            if (fotoRemover && fotoRemover.fileObject) {
                setFotosNovas(prev => prev.filter(file => file !== fotoRemover.fileObject));
            }
        } else { // Se for uma foto existente (id numérico), remove de fotosExistentes
            setFotosExistentes(prev => prev.filter(foto => foto.id !== id));
        }
        setFotosPreview(prev => prev.filter(foto => foto.id !== id));
    };

    const validarFormulario = () => {
        const novosErros = {};

        if (!formData.empresa_id) {
            novosErros.empresa_id = 'Empresa é obrigatória';
        }

        if (!formData.cliente_id) {
            novosErros.cliente_id = 'Cliente é obrigatório';
        }

        if (!formData.data_orcamento) {
            novosErros.data_orcamento = 'Data do orçamento é obrigatória';
        }

        if (!formData.validade_orcamento) {
            novosErros.validade_orcamento = 'Validade é obrigatória';
        }

        const temServicos = servicos.some(s => s.servico.trim());
        const temMateriais = materiais.some(m => m.material.trim());

        if (!temServicos && !temMateriais) {
            novosErros.itens = 'É necessário adicionar pelo menos um serviço ou material';
        }

        servicos.forEach((servico, index) => {
            if (servico.servico.trim() && (!servico.preco_unitario || servico.preco_unitario <= 0)) {
                novosErros[`servico_${index}`] = 'Preço unitário deve ser maior que zero';
            }
        });

        materiais.forEach((material, index) => {
            if (material.material.trim() && (!material.preco_unitario || material.preco_unitario <= 0)) {
                novosErros[`material_${index}`] = 'Preço unitário deve ser maior que zero';
            }
        });

        setErrors(novosErros);
        return Object.keys(novosErros).length === 0;
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            if (window.confirm('Você tem alterações não salvas. Deseja realmente sair sem salvar?')) {
                setHasUnsavedChanges(false);
                onCancel();
            }
        } else {
            onCancel();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('🚀 Iniciando handleSubmit');
        console.log('📊 Estado atual - submitting:', submitting, 'isSubmittingRef:', isSubmittingRef.current);

        if (!preventMultipleSubmissions()) {
            return;
        }

        try {
            if (!formData.cliente_id || formData.cliente_id === '' || formData.cliente_id === '0') {
                toast.error('Por favor, selecione um cliente');
                releaseSubmission();
                return;
            }

            const clienteIdNum = parseInt(formData.cliente_id);
            if (isNaN(clienteIdNum) || clienteIdNum <= 0) {
                toast.error('Cliente selecionado é inválido');
                releaseSubmission();
                return;
            }

            if (!validarFormulario()) {
                toast.error('Por favor, corrija os erros no formulário');
                releaseSubmission();
                return;
            }

            console.log('✅ Validações passaram - prosseguindo com envio');

            const formDataToSend = new FormData();

            // Adicionar campos de texto ao FormData
            formDataToSend.append("numero_orcamento", formData.numero_orcamento);
            formDataToSend.append("empresa_id", formData.empresa_id);
            formDataToSend.append("cliente_id", clienteIdNum);
            formDataToSend.append("referencia", formData.referencia);
            formDataToSend.append("data_orcamento", formData.data_orcamento);
            formDataToSend.append("validade_orcamento", formData.validade_orcamento);
            formDataToSend.append("prazo_inicio", formData.prazo_inicio);
            formDataToSend.append("prazo_duracao", formData.prazo_duracao);
            formDataToSend.append("observacoes", formData.observacoes);
            formDataToSend.append("imposto_percentual", formData.imposto_percentual);
            formDataToSend.append("frete", formData.frete);
            formDataToSend.append("desconto_valor", formData.desconto_valor);
            formDataToSend.append("desconto_percentual", formData.desconto_percentual);
            formDataToSend.append("tipo_desconto", formData.tipo_desconto);
            formDataToSend.append("condicoes_pagamento", formData.condicoes_pagamento);
            formDataToSend.append("meios_pagamento", formData.meios_pagamento);
            formDataToSend.append("anotacoes_internas", formData.anotacoes_internas);
            formDataToSend.append("valor_total", formData.valor_total);
            formDataToSend.append("status", formData.status);

            // Adicionar serviços e materiais como strings JSON
            formDataToSend.append("servicos", JSON.stringify(servicos
                .filter(s => s.servico.trim())
                .map(s => ({
                    descricao: s.servico,
                    observacao: s.detalhes,
                    valor_unitario: s.preco_unitario,
                    quantidade: s.quantidade,
                    valor_total: s.valor_total,
                    tipo_especifico: s.servico,
                    id: s.id // Incluir ID para edição de serviços existentes
                }))
            ));

            formDataToSend.append("materiais", JSON.stringify(materiais
                .filter(m => m.material.trim())
                .map(m => ({
                    descricao: m.material,
                    observacao: m.detalhes,
                    valor_unitario: m.preco_unitario,
                    quantidade: m.quantidade,
                    valor_total: m.valor_total,
                    tipo_especifico: m.material,
                    id: m.id // Incluir ID para edição de materiais existentes
                }))
            ));


            // Adicionar fotos novas ao FormData
            fotosNovas.forEach((file, index) => {

                formDataToSend.append(`fotos_novas[]`, file);
            });

            // Adicionar IDs/caminhos de fotos existentes que devem ser mantidas
            formDataToSend.append("fotos_existentes", JSON.stringify(fotosExistentes.map(foto => foto.id)));

            console.log("📤 Preparando FormData para envio:", formDataToSend);

            await onSave(formDataToSend);

            setHasUnsavedChanges(false);

        } catch (error) {
            console.error("❌ Erro ao preparar envio do orçamento:", error);

        } finally {
            releaseSubmission();
            console.log("🏁 Submissão finalizada");
        }
    };

    const totais = calcularTotais();

    return (
        <>
            {
                message.text && (
                    <div className={`form-message ${message.type}`}>
                        {message.type === 'success' ? '✓' : '⚠'} {message.text}
                    </div>
                )
            }

            <form onSubmit={handleSubmit} className="orcamento-form">
                <div className="form-sections-wrapper">
                    {/* Seção 1: Dados Principais */}
                    <div className="form-section">
                        <div className="section-header">
                            <Building2 size={20} />
                            <h3>Dados Principais</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>
                                    <FileText size={16} />
                                    Número do Orçamento
                                </label>
                                <input
                                    type="text"
                                    value={formData.numero_orcamento}
                                    readOnly
                                    placeholder="Ex: 0001/2025"
                                    className={errors.numero_orcamento ? 'error' : ''}
                                    required
                                />
                                {errors.numero_orcamento && <span className="error-message">{errors.numero_orcamento}</span>}
                            </div>

                            <div className="form-group">
                                <label>
                                    <Building2 size={16} />
                                    Empresa *
                                </label>
                                <select
                                    value={formData.empresa_id}
                                    onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                                    className={errors.empresa_id ? 'error' : ''}
                                    required
                                >
                                    <option value="">Selecione uma empresa</option>
                                    {empresas?.map(empresa => (
                                        <option key={empresa.id} value={empresa.id}>
                                            {empresa.nome}
                                        </option>
                                    ))}
                                </select>
                                {errors.empresa_id && <span className="error-message">{errors.empresa_id}</span>}
                            </div>

                            <div className="form-group">
                                <label>
                                    <Users size={16} />
                                    Cliente *
                                </label>

                                <input
                                    type="text"
                                    placeholder="Digite nome, razão social ou CNPJ"
                                    value={formData.clienteBusca || ""}
                                    onChange={(e) => {
                                        const termo = e.target.value.toLowerCase();
                                        setFormData((prev) => ({ ...prev, clienteBusca: termo }));

                                        const filtrados = clientes.filter(
                                            (c) =>
                                                c.nome?.toLowerCase().includes(termo) ||
                                                c.nome_fantasia?.toLowerCase().includes(termo) ||
                                                c.razao_social?.toLowerCase().includes(termo) ||
                                                c.cnpj?.toLowerCase().includes(termo)
                                        );
                                        setClientesFiltrados(filtrados);
                                    }}
                                    onBlur={() => {
                                        if (!formData.cliente_id && formData.clienteBusca?.length > 2) {
                                            if (
                                                window.confirm(
                                                    "⚠️ Cliente não encontrado. Deseja criar um novo cliente?"
                                                )
                                            ) {
                                                window.location.href = "/clientes/novo"; // 👉 ou chame aqui o modal de cadastro
                                            } else {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    clienteBusca: "",
                                                    cliente_id: "",
                                                }));
                                            }
                                        }
                                    }}
                                    className={errors.cliente_id ? "error" : ""}
                                    required
                                />

                                {clientesFiltrados?.length > 0 && (
                                    <ul className="autocomplete-list">
                                        {clientesFiltrados.map((c) => (
                                            <li
                                                key={c.id}
                                                onMouseDown={() => {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        cliente_id: c.id,
                                                        // Usa o nome mais relevante para preencher o campo
                                                        clienteBusca: c.nome_fantasia || c.razao_social || c.nome,
                                                    }));
                                                    setClientesFiltrados([]);
                                                }}
                                            >
                                                <strong className="cliente-nome-principal">
                                                    {c.nome_fantasia || c.razao_social || c.nome}
                                                </strong>
                                                <span className="cliente-documento">
                                                    {c.cnpj || c.cpf_cnpj}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {errors.cliente_id && (
                                    <span className="error-message">{errors.cliente_id}</span>
                                )}
                            </div>

                            {orcamento && orcamento.id && (
                                <div className="form-group">
                                    <label>
                                        <CheckCircle size={16} />
                                        Status do Orçamento *
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        required
                                    >
                                        <option value="Rascunho">Rascunho</option>
                                        <option value="Pendente">Pendente</option>
                                        <option value="Aguardando Aprovacao">Aguardando Aprovação</option>
                                        <option value="Aprovado">Aprovado</option>
                                        <option value="Rejeitado">Rejeitado</option>
                                        <option value="Cancelado">Cancelado</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group full-width">
                                <label>Referência</label>
                                <input
                                    type="text"
                                    value={formData.referencia}
                                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                                    placeholder="Ex: Projeto Sistema Web"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Datas e Prazos */}
                    <div className="form-section">
                        <div className="section-header">
                            <Calendar size={20} />
                            <h3>Datas e Prazos</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>
                                    <Calendar size={16} />
                                    Data do Orçamento *
                                </label>
                                <input
                                    type="date"
                                    value={formData.data_orcamento}
                                    onChange={(e) => setFormData({ ...formData, data_orcamento: e.target.value })}
                                    className={errors.data_orcamento ? 'error' : ''}
                                    required
                                />
                                {errors.data_orcamento && <span className="error-message">{errors.data_orcamento}</span>}
                            </div>

                            <div className="form-group">
                                <label>
                                    <Calendar size={16} />
                                    Validade *
                                </label>
                                <input
                                    type="date"
                                    value={formData.validade_orcamento}
                                    onChange={(e) => setFormData({ ...formData, validade_orcamento: e.target.value })}
                                    className={errors.validade_orcamento ? 'error' : ''}
                                    required
                                />
                                {errors.validade_orcamento && <span className="error-message">{errors.validade_orcamento}</span>}
                            </div>

                            <div className="form-group">
                                <label>Prazo de Início</label>
                                <input
                                    type="date"
                                    value={formData.prazo_inicio}
                                    onChange={(e) => setFormData({ ...formData, prazo_inicio: e.target.value })}
                                    placeholder="dd/mm/aaaa"
                                />
                            </div>

                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input
                                    type="number"
                                    value={formData.prazo_duracao}
                                    onChange={(e) => setFormData({ ...formData, prazo_duracao: e.target.value })}
                                    placeholder="Ex: 30"
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seção 3: Serviços */}
                    <div className="form-section">
                        <div className="section-header">
                            <Wrench size={20} />
                            <h3>Serviços</h3>
                            <button type="button" onClick={adicionarServico} className="btn-add-item">
                                <Plus size={16} />
                                Adicionar Serviço
                            </button>
                        </div>

                        {servicos.map((servico, index) => (
                            <div key={servico.id} className="item-card">
                                <div className="item-header">
                                    <h4>Serviço #{index + 1}</h4>
                                    {servicos.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removerServico(servico.id)}
                                            className="btn-remove-item"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="item-grid">
                                    <div className="form-group">
                                        <label>Qual o Serviço? *</label>
                                        <input
                                            type="text"
                                            value={servico.servico}
                                            onChange={(e) => atualizarServico(servico.id, 'servico', e.target.value)}
                                            placeholder="Ex: Desenvolvimento de Sistema"
                                            className={errors[`servico_${index}`] ? 'error' : ''}
                                        />
                                        {errors[`servico_${index}`] && <span className="error-message">{errors[`servico_${index}`]}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Preço Unitário *</label>
                                        <input
                                            type="number"
                                            value={servico.preco_unitario}
                                            onChange={(e) => atualizarServico(servico.id, 'preco_unitario', parseFloat(e.target.value) || 0)}
                                            placeholder="0,00"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Quantidade *</label>
                                        <input
                                            type="number"
                                            value={servico.quantidade}
                                            onChange={(e) => atualizarServico(servico.id, 'quantidade', parseFloat(e.target.value) || 1)}
                                            placeholder="1"
                                            step="0.01"
                                            min="0.01"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Desconto (R$)</label>
                                        <input
                                            type="number"
                                            value={servico.desconto}
                                            onChange={(e) => atualizarServico(servico.id, 'desconto', parseFloat(e.target.value) || 0)}
                                            placeholder="0,00"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Detalhes do Serviço</label>
                                        <textarea
                                            value={servico.detalhes}
                                            onChange={(e) => atualizarServico(servico.id, 'detalhes', e.target.value)}
                                            placeholder="Descreva os detalhes do serviço..."
                                            rows="3"
                                        />
                                    </div>
                                </div>
                                <div className="item-total">
                                    <strong>Total: R$ {servico.valor_total.toFixed(2)}</strong>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Seção 4: Materiais */}
                    <div className="form-section">
                        <div className="section-header">
                            <Package size={20} />
                            <h3>Materiais</h3>
                            <button type="button" onClick={adicionarMaterial} className="btn-add-item">
                                <Plus size={16} />
                                Adicionar Material
                            </button>
                        </div>

                        {materiais.map((material, index) => (
                            <div key={material.id} className="item-card">
                                <div className="item-header">
                                    <h4>Material #{index + 1}</h4>
                                    {materiais.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removerMaterial(material.id)}
                                            className="btn-remove-item"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="item-grid">
                                    <div className="form-group">
                                        <label>Qual o Material? *</label>
                                        <input
                                            type="text"
                                            value={material.material}
                                            onChange={(e) => atualizarMaterial(material.id, 'material', e.target.value)}
                                            placeholder="Ex: Cabo de Rede Cat6"
                                            className={errors[`material_${index}`] ? 'error' : ''}
                                        />
                                        {errors[`material_${index}`] && <span className="error-message">{errors[`material_${index}`]}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Preço Unitário *</label>
                                        <input
                                            type="number"
                                            value={material.preco_unitario}
                                            onChange={(e) => atualizarMaterial(material.id, 'preco_unitario', parseFloat(e.target.value) || 0)}
                                            placeholder="0,00"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Quantidade *</label>
                                        <input
                                            type="number"
                                            value={material.quantidade}
                                            onChange={(e) => atualizarMaterial(material.id, 'quantidade', parseFloat(e.target.value) || 1)}
                                            placeholder="1"
                                            step="0.01"
                                            min="0.01"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Desconto (R$)</label>
                                        <input
                                            type="number"
                                            value={material.desconto}
                                            onChange={(e) => atualizarMaterial(material.id, 'desconto', parseFloat(e.target.value) || 0)}
                                            placeholder="0,00"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Detalhes do Material</label>
                                        <textarea
                                            value={material.detalhes}
                                            onChange={(e) => atualizarMaterial(material.id, 'detalhes', e.target.value)}
                                            placeholder="Descreva os detalhes do material..."
                                            rows="3"
                                        />
                                    </div>
                                </div>
                                <div className="item-total">
                                    <strong>Total: R$ {material.valor_total.toFixed(2)}</strong>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Seção 5: Fotos do Projeto */}
                    <div className="form-section">
                        <div className="section-header">
                            <Image size={20} />
                            <h3>Fotos do Projeto</h3>
                        </div>
                        <div className="upload-area">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                className="file-input"
                                id="fotos-upload"
                            />
                            <label htmlFor="fotos-upload" className="upload-label">
                                <Upload size={24} />
                                <span>Clique para adicionar fotos ou arraste aqui</span>
                                <small>PNG, JPG até 10MB cada</small>
                            </label>
                        </div>

                        {fotosPreview.length > 0 && (
                            <div className="fotos-preview">
                                {fotosPreview.map(foto => (
                                    <div key={foto.id} className="foto-preview">
                                        <img src={foto.url} alt={foto.name} />
                                        <button
                                            type="button"
                                            onClick={() => removerFoto(foto.id)}
                                            className="btn-remove-foto"
                                        >
                                            <X size={16} />
                                        </button>
                                        <span className="foto-name">{foto.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Seção 6: Valores e Descontos */}
                    <div className="form-section">
                        <div className="section-header">
                            <Calculator size={20} />
                            <h3>Valores e Descontos</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Imposto (%)</label>
                                <input
                                    type="number"
                                    value={formData.imposto_percentual}
                                    onChange={(e) => setFormData({ ...formData, imposto_percentual: parseFloat(e.target.value) || 0 })}
                                    placeholder="0"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                />
                            </div>

                            <div className="form-group">
                                <label>Frete (R$)</label>
                                <input
                                    type="number"
                                    value={formData.frete}
                                    onChange={(e) => setFormData({ ...formData, frete: parseFloat(e.target.value) || 0 })}
                                    placeholder="0,00"
                                    step="0.01"
                                    min="0"
                                />
                            </div>

                            <div className="form-group">
                                <label>Tipo de Desconto</label>
                                <select
                                    value={formData.tipo_desconto}
                                    onChange={(e) => setFormData({ ...formData, tipo_desconto: e.target.value })}
                                >
                                    <option value="valor">Valor (R$)</option>
                                    <option value="percentual">Percentual (%)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>
                                    {formData.tipo_desconto === 'valor' ? 'Desconto (R$)' : 'Desconto (%)'}
                                </label>
                                <input
                                    type="number"
                                    value={formData.tipo_desconto === 'valor' ? formData.desconto_valor : formData.desconto_percentual}
                                    onChange={(e) => {
                                        const valor = parseFloat(e.target.value) || 0;
                                        if (formData.tipo_desconto === 'valor') {
                                            setFormData({ ...formData, desconto_valor: valor });
                                        } else {
                                            setFormData({ ...formData, desconto_percentual: valor });
                                        }
                                    }}
                                    placeholder="0"
                                    step="0.01"
                                    min="0"
                                    max={formData.tipo_desconto === 'percentual' ? 100 : undefined}
                                />
                            </div>
                        </div>

                        {/* Resumo dos Totais */}
                        <div className="totals-summary">
                            <div className="total-row">
                                <span>Subtotal Serviços:</span>
                                <span>R$ {totais.subtotalServicos.toFixed(2)}</span>
                            </div>
                            <div className="total-row">
                                <span>Subtotal Materiais:</span>
                                <span>R$ {totais.subtotalMateriais.toFixed(2)}</span>
                            </div>
                            <div className="total-row">
                                <span>Subtotal:</span>
                                <span>R$ {totais.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="total-row">
                                <span>Imposto ({formData.imposto_percentual}%):</span>
                                <span>R$ {totais.valorImposto.toFixed(2)}</span>
                            </div>
                            <div className="total-row">
                                <span>Frete:</span>
                                <span>R$ {totais.valorFrete.toFixed(2)}</span>
                            </div>
                            <div className="total-row">
                                <span>Desconto:</span>
                                <span>- R$ {totais.valorDesconto.toFixed(2)}</span>
                            </div>
                            <div className="total-row total-final">
                                <span>Total Final:</span>
                                <span>R$ {totais.valorTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Seção 7: Informações Adicionais */}
                    <div className="form-section">
                        <div className="section-header">
                            <FileText size={20} />
                            <h3>Informações Adicionais</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Observações</label>
                                <textarea
                                    value={formData.observacoes}
                                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                    placeholder="Observações gerais sobre o orçamento..."
                                    rows="4"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Condições de Pagamento</label>
                                <textarea
                                    value={formData.condicoes_pagamento}
                                    onChange={(e) => setFormData({ ...formData, condicoes_pagamento: e.target.value })}
                                    placeholder="Ex: 50% na assinatura, 50% na entrega"
                                    rows="3"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Meios de Pagamento</label>
                                <textarea
                                    value={formData.meios_pagamento}
                                    onChange={(e) => setFormData({ ...formData, meios_pagamento: e.target.value })}
                                    placeholder="Ex: PIX, Cartão, Boleto"
                                    rows="2"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Anotações Internas</label>
                                <textarea
                                    value={formData.anotacoes_internas}
                                    onChange={(e) => setFormData({ ...formData, anotacoes_internas: e.target.value })}
                                    placeholder="Anotações para uso interno..."
                                    rows="3"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mostrar erros gerais */}
                    {errors.itens && (
                        <div className="form-error-general">
                            ⚠ {errors.itens}
                        </div>
                    )}
                </div>

                {/* Botões de Ação */}
                <div className="form-actions">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-cancelar"
                        disabled={submitting}
                    >
                        <X size={16} />
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className={`btn-salvar ${submitting ? 'loading' : ''}`}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <div className="spinner"></div>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Salvar Orçamento
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* CSS adicional para o spinner */}
            <div >
                <style>{`
                .btn-salvar.loading {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #f3f3f3;
                    border-top: 2px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                    margin-right: 8px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `} </style>
            </div >
        </>
    );
};


export default FormularioOrcamentoExpandido;
