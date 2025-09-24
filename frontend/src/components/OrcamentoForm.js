import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Componentes reutilizáveis para inputs
const FormInput = ({ label, ...props }) => (
    <div className="form-group">
        <label>{label}</label>
        <input className="form-input" {...props} />
    </div>
);

const FormSelect = ({ label, children, ...props }) => (
    <div className="form-group">
        <label>{label}</label>
        <select className="form-input" {...props}>{children}</select>
    </div>
);

const FormTextarea = ({ label, ...props }) => (
    <div className="form-group">
        <label>{label}</label>
        <textarea className="form-input" {...props}></textarea>
    </div>
);

// Componente para um item de orçamento individual
const OrcamentoItem = ({ item, index, onItemChange, onRemoveItem }) => {
    return (
        <div className="item-row">
            <input
                name="descricao"
                value={item.descricao}
                onChange={e => onItemChange(index, e)}
                placeholder={item.tipo_item === 'Servico' ? 'Descrição do Serviço' : 'Descrição do Material'}
                className="form-input"
                required
            />
            <input
                name="quantidade"
                type="number"
                value={item.quantidade}
                onChange={e => onItemChange(index, e)}
                className="form-input"
            />
            <input
                name="valor_unitario"
                type="number"
                value={item.valor_unitario}
                onChange={e => onItemChange(index, e)}
                className="form-input"
            />
            <span className="total-cell">{parseFloat(item.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            <button type="button" onClick={() => onRemoveItem(index)} className="btn-icon btn-danger"><FaTrash /></button>
        </div>
    );
};

export default function OrcamentoForm({ onClose, onSaveSuccess, initialData }) {
    const [formData, setFormData] = useState(initialData || {
        empresa_id: '',
        cliente_id: '',
        referencia: '',
        validade_orcamento: '15 dias',
        prazo_inicio: 'A combinar',
        prazo_duracao: 'A combinar',
        observacoes: '',
        imposto_percentual: 0,
        frete: 0,
        desconto_valor: 0,
        desconto_percentual: 0, // Adicionado para consistência com o banco de dados
        tipo_desconto: 'valor_total', // Adicionado para consistência com o banco de dados
        condicoes_pagamento: 'À Vista',
        meios_pagamento: 'PIX',
        anotacoes_internas: '',
        itens: [],
        usuario_id: 1, // Idealmente, obter do contexto de autenticação
    });

    const [clientes, setClientes] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [isEditing, setIsEditing] = useState(!!initialData); // Verifica se está em modo de edição

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [clientesRes, empresasRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_URL}/clientes.php`),
                    axios.get(`${process.env.REACT_APP_API_URL}/empresas.php`)
                ]);
                if (clientesRes.data.success) setClientes(clientesRes.data.data);
                if (empresasRes.data.success) setEmpresas(empresasRes.data.data);
            } catch (err) {
                console.error("Erro ao buscar dados iniciais:", err);
                toast.error('Não foi possível carregar clientes e empresas.');
            }
        };
        fetchInitialData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, e) => {
        const { name, value } = e.target;
        const newItens = [...formData.itens];
        newItens[index][name] = value;

        const qty = parseFloat(newItens[index].quantidade) || 0;
        const price = parseFloat(newItens[index].valor_unitario) || 0;
        newItens[index].valor_total = qty * price;
        setFormData(prev => ({ ...prev, itens: newItens }));
    };

    const handleAddItem = (tipo) => {
        setFormData(prev => ({
            ...prev,
            itens: [
                ...prev.itens,
                {
                    tipo_item: tipo,
                    descricao: '',
                    quantidade: 1,
                    valor_unitario: 0,
                    valor_total: 0,
                },
            ],
        }));
    };

    const handleRemoveItem = (index) => {
        const newItens = formData.itens.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, itens: newItens }));
    };

    const totals = useMemo(() => {
        const subtotal = formData.itens.reduce((acc, item) => acc + (parseFloat(item.valor_total) || 0), 0);
        const impostoPercentual = parseFloat(formData.imposto_percentual) / 100 || 0;
        const frete = parseFloat(formData.frete) || 0;

        let descontoCalculado = 0;
        if (formData.tipo_desconto === 'valor_total') {
            descontoCalculado = parseFloat(formData.desconto_valor) || 0;
        } else if (formData.tipo_desconto === 'servicos') {
            // Lógica para calcular desconto sobre serviços
            // Isso exigiria que os itens tivessem um campo 'is_service' ou similar
            // Por simplicidade, vamos aplicar o desconto percentual sobre o subtotal de serviços
            const subtotalServicos = formData.itens.reduce((acc, item) => item.tipo_item === 'Servico' ? acc + (parseFloat(item.valor_total) || 0) : acc, 0);
            descontoCalculado = subtotalServicos * (parseFloat(formData.desconto_percentual) / 100 || 0);
        } else if (formData.tipo_desconto === 'materiais') {
            // Lógica para calcular desconto sobre materiais
            const subtotalMateriais = formData.itens.reduce((acc, item) => item.tipo_item === 'Material' ? acc + (parseFloat(item.valor_total) || 0) : acc, 0);
            descontoCalculado = subtotalMateriais * (parseFloat(formData.desconto_percentual) / 100 || 0);
        }

        const valorImposto = subtotal * impostoPercentual;
        const valorTotal = subtotal + valorImposto + frete - descontoCalculado;

        return { subtotal, valorImposto, frete, descontoCalculado, valorTotal };
    }, [formData.itens, formData.imposto_percentual, formData.frete, formData.desconto_valor, formData.desconto_percentual, formData.tipo_desconto]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.cliente_id || !formData.empresa_id) {
            toast.error('Por favor, selecione uma Empresa e um Cliente.');
            return;
        }
        if (formData.itens.length === 0) {
            toast.error('Adicione pelo menos um item ao orçamento.');
            return;
        }

        try {
            const dataToSend = { ...formData, valor_total: totals.valorTotal };
            const API_ENDPOINT = isEditing
                ? `${process.env.REACT_APP_API_URL}/orcamentos.php?id=${formData.id}`
                : `${process.env.REACT_APP_API_URL}/orcamentos.php`;

            const response = await axios.post(API_ENDPOINT, dataToSend);

            if (response.data.success) {
                toast.success(isEditing ? 'Orçamento atualizado com sucesso!' : 'Orçamento salvo com sucesso!');
                onSaveSuccess();
            } else {
                toast.error(response.data.error || 'Ocorreu um erro ao salvar/atualizar.');
            }
        } catch (err) {
            console.error("Erro ao salvar/atualizar orçamento:", err);
            toast.error('Erro de conexão ao salvar/atualizar o orçamento.');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}</h2>
                    <button onClick={onClose} className="btn-icon"><FaTimes /></button>
                </div>
                <form onSubmit={handleSubmit}>

                    <h3 className="section-title">Dados Gerais</h3>
                    <div className="form-grid">
                        <FormSelect label="Empresa Geradora*" name="empresa_id" value={formData.empresa_id} onChange={handleChange} required>
                            <option value="">Selecione a Empresa</option>
                            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
                        </FormSelect>
                        <FormSelect label="Cliente*" name="cliente_id" value={formData.cliente_id} onChange={handleChange} required>
                            <option value="">Selecione o Cliente</option>
                            {clientes.map(cli => <option key={cli.id} value={cli.id}>{cli.nome}</option>)}
                        </FormSelect>
                        <FormInput label="Referência" name="referencia" value={formData.referencia} onChange={handleChange} />
                    </div>

                    <h3 className="section-title">Prazos e Condições</h3>
                    <div className="form-grid">
                        <FormInput label="Validade da Proposta" name="validade_orcamento" value={formData.validade_orcamento} onChange={handleChange} />
                        <FormInput label="Prazo de Início" name="prazo_inicio" value={formData.prazo_inicio} onChange={handleChange} />
                        <FormInput label="Prazo de Duração" name="prazo_duracao" value={formData.prazo_duracao} onChange={handleChange} />
                    </div>
                    <FormTextarea label="Observações Gerais (visível ao cliente)" name="observacoes" value={formData.observacoes} onChange={handleChange} />

                    <h3 className="section-title">Itens do Orçamento</h3>
                    <div className="item-list">
                        <div className="item-row item-header">
                            <span>Descrição</span>
                            <span>Qtd.</span>
                            <span>Preço Unit.</span>
                            <span>Total</span>
                            <span></span>
                        </div>
                        {formData.itens.map((item, index) => (
                            <OrcamentoItem
                                key={index}
                                item={item}
                                index={index}
                                onItemChange={handleItemChange}
                                onRemoveItem={handleRemoveItem}
                            />
                        ))}
                    </div>
                    <button type="button" onClick={() => handleAddItem('Servico')} className="btn-add-item"><FaPlus /> Adicionar Serviço</button>
                    <button type="button" onClick={() => handleAddItem('Material')} className="btn-add-item" style={{ marginLeft: '10px' }}><FaPlus /> Adicionar Material</button>

                    <h3 className="section-title">Financeiro</h3>
                    <div className="form-grid">
                        <FormInput label="Imposto (%)" name="imposto_percentual" type="number" value={formData.imposto_percentual} onChange={handleChange} />
                        <FormInput label="Frete (R$)" name="frete" type="number" value={formData.frete} onChange={handleChange} />

                        <FormSelect label="Tipo de Desconto" name="tipo_desconto" value={formData.tipo_desconto} onChange={handleChange}>
                            <option value="valor_total">Valor Fixo</option>
                            <option value="servicos">Sobre Serviços (%)</option>
                            <option value="materiais">Sobre Materiais (%)</option>
                        </FormSelect>

                        {formData.tipo_desconto === 'valor_total' ? (
                            <FormInput label="Desconto (R$)" name="desconto_valor" type="number" value={formData.desconto_valor} onChange={handleChange} />
                        ) : (
                            <FormInput label="Desconto (%)" name="desconto_percentual" type="number" value={formData.desconto_percentual} onChange={handleChange} />
                        )}

                        <div className="form-group">
                            <label>Subtotal dos Itens</label>
                            <p>{totals.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="form-group">
                            <label>Valor Imposto</label>
                            <p>{totals.valorImposto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="form-group">
                            <label>Valor Frete</label>
                            <p>{totals.frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="form-group">
                            <label>Valor Desconto</label>
                            <p>{totals.descontoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="form-group">
                            <label>Valor Final</label>
                            <h3>{totals.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
                        </div>
                    </div>

                    <h3 className="section-title">Pagamento e Anotações</h3>
                    <div className="form-grid">
                        <FormInput label="Condições de Pagamento" name="condicoes_pagamento" value={formData.condicoes_pagamento} onChange={handleChange} />
                        <FormInput label="Meios de Pagamento" name="meios_pagamento" value={formData.meios_pagamento} onChange={handleChange} />
                    </div>
                    <FormTextarea label="Anotações Internas (não visível ao cliente)" name="anotacoes_internas" value={formData.anotacoes_internas} onChange={handleChange} />

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-primary btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">{isEditing ? 'Atualizar Orçamento' : 'Salvar Orçamento'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}


