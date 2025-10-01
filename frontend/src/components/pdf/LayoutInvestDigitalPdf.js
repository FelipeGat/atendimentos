import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import logoImage from '../../assets/invest.jpg'; // Certifique-se de que o caminho está correto

// Paleta Invest Digital original
const primaryColor = '#0A3D62'; // Azul Escuro
const secondaryColor = '#60A3D9'; // Azul Claro
const backgroundLight = '#F4F6F9'; // Cinza Claro
const textColor = '#222222';
const lightTextColor = '#555555';

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 9,
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 30,
        backgroundColor: '#FFFFFF',
        color: textColor,
    },

    headerBar: {
        backgroundColor: primaryColor,
        height: 50,
        position: 'absolute',
        top: 0, left: 0, right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 25,
        justifyContent: 'space-between',
    },
    logo: { width: 50, height: 'auto' },
    companyInfo: { color: '#FFFFFF' },
    companyName: { fontSize: 11, fontWeight: 'bold' },
    companyDetails: { fontSize: 7 },
    dateText: {
        fontSize: 8, // De 9 para 8
        fontWeight: 'bold',
        color: secondaryColor,
        marginTop: 1 // De 2 para 1
    },

    // Título - Reduzindo margens e preenchimento
    orcamentoTitleContainer: {
        marginTop: 17, // De 20 para 15
        marginBottom: 12, // De 15 para 10
        padding: 8, // De 10 para 6
        backgroundColor: backgroundLight,
        borderLeft: `3 solid ${primaryColor}`, // De 4 para 3
    },
    orcamentoTitle: { fontSize: 12, fontWeight: 'bold', color: primaryColor }, // De 14 para 12
    orcamentoNumber: { fontSize: 12, fontWeight: 'bold', color: secondaryColor }, // De 14 para 12

    // Seção Cliente - Reduzindo margens e fonte
    sectionHeading: { fontSize: 10, fontWeight: 'bold', color: primaryColor, marginBottom: 3 }, // De 10 para 9, margem menor
    clientSection: { marginBottom: 10, paddingBottom: 5, borderBottom: `1 solid ${backgroundLight}` }, // Margens e preenchimento menores
    clientInfoRow: { flexDirection: 'row', marginBottom: 2 }, // Margem menor
    clientLabel: { width: '20%', fontSize: 7, fontWeight: 'bold', color: lightTextColor }, // De 25% para 20%, De 8 para 7
    clientValue: { width: '80%', fontSize: 7 }, // De 75% para 80%, De 8 para 7

    // Tabelas - Reduzindo preenchimento e ajustando larguras
    table: { marginBottom: 10 }, // Margem menor
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: secondaryColor,
        color: '#FFFFFF',
        fontWeight: 'bold',
        paddingVertical: 3, // De 5 para 3
        paddingHorizontal: 5, // De 8 para 5
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 3, // De 5 para 3
        paddingHorizontal: 5, // De 8 para 5
        borderBottom: `1 solid ${backgroundLight}`,
    },
    // Ajuste de largura das colunas: Descrição maior, Qtd e Un menor
    colDesc: { width: '50%' }, // De 45% para 50%
    colUn: { width: '8%', textAlign: 'center' }, // De 10% para 8%
    colPrecoUnit: { width: '14%', textAlign: 'right' }, // De 15% para 14%
    colQtd: { width: '8%', textAlign: 'center' }, // De 10% para 8%
    colPreco: { width: '20%', textAlign: 'right' },

    // Novo estilo para o rodapé das tabelas (Totais)
    tableFooterRow: {
        flexDirection: 'row',
        paddingVertical: 3,
        paddingHorizontal: 5,
        borderBottom: `1 solid ${backgroundLight}`,
        backgroundColor: backgroundLight,
        fontWeight: 'bold',
    },

    // Totais - Caixa de totais mais estreita e margem menor
    totalsBox: {
        width: '35%', // De 40% para 35%
        border: `1 solid ${secondaryColor}`,
        borderRadius: 3,
        marginLeft: 'auto',
        marginBottom: 15, // De 20 para 15
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 4, // De 5 para 4
        borderBottom: `1 solid ${backgroundLight}`,
        fontSize: 8, // De 9 para 8
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: primaryColor,
        color: '#FFFFFF',
        padding: 5, // De 7 para 5
        fontWeight: 'bold',
        fontSize: 10, // De 11 para 10
    },

    // Observações - Reduzindo margens, preenchimento e fonte
    additionalInfoSection: {
        marginBottom: 15, // De 20 para 15
        borderLeft: `2 solid ${primaryColor}`, // De 3 para 2
        paddingLeft: 6, // De 8 para 6
    },
    additionalInfoText: { fontSize: 7, color: lightTextColor, lineHeight: 1.3 }, // De 8 para 7, lineHeight menor

    // Assinaturas - Margem superior menor
    signaturesSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20, // De 40 para 20
        marginBottom: 10, // De 15 para 10
        textAlign: 'center',
    },
    signatureBox: { width: '40%', borderTop: `1 solid ${lightTextColor}`, paddingTop: 3 }, // Preenchimento menor
    signatureText: { fontSize: 7 }, // De 8 para 7

    // Rodapé - Reduzindo altura e fonte
    footer: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 18, // De 25 para 18
        backgroundColor: secondaryColor,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25, // De 30 para 25
        fontSize: 6, // De 7 para 6
        color: '#FFFFFF',
    },
    pageNumber: { fontSize: 6, color: primaryColor, fontWeight: 'bold' },

    // A seção de fotos é mantida, mas não forçará uma nova página (o bloco de renderização da Page será removido)
    photosSection: {
        marginTop: 10,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: backgroundLight,
        // pageBreakBefore: 'always', // REMOVIDO para tentar encaixar na primeira página, se necessário
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    photoItem: {
        width: '32%',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        padding: 2,
        borderRadius: 2,
    },
    photoImage: {
        width: '100%',
        height: 60, // Altura reduzida
        objectFit: 'cover',
        borderRadius: 1,
    },
    photoCaption: {
        fontSize: 6,
        textAlign: 'center',
        marginTop: 2,
        color: lightTextColor,
    },
});

// Funções auxiliares
const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('pt-BR');
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
};

const calcularTotais = (orcamento) => {
    const calcularPrecoUnitario = (item) => {
        // Usa o valor unitário fornecido, ou calcula se o total e a qtd existirem.
        if (Number(item.valor_unitario) > 0) {
            return Number(item.valor_unitario);
        }
        const total = Number(item.valor_total) || 0;
        const qtd = Number(item.quantidade) || 1;
        // Previne divisão por zero e garante que o cálculo é feito
        return (qtd > 0) ? (total / qtd) : total;
    };

    const servicosComUnitario = (orcamento.servicos || []).map(servico => ({
        ...servico,
        valor_unitario_calculado: calcularPrecoUnitario(servico),
        // Garante que valor_total é um número para a soma
        valor_total: Number(servico.valor_total) || 0,
        quantidade: servico.quantidade || 0,
    }));

    const materiaisComUnitario = (orcamento.materiais || []).map(material => ({
        ...material,
        valor_unitario_calculado: calcularPrecoUnitario(material),
        valor_total: Number(material.valor_total) || 0,
        quantidade: material.quantidade || 0,
    }));

    const subtotalServicos = servicosComUnitario.reduce((acc, servico) => acc + servico.valor_total, 0);
    const subtotalMateriais = materiaisComUnitario.reduce((acc, material) => acc + material.valor_total, 0);
    const subtotal = subtotalServicos + subtotalMateriais;

    // Garante que o percentual seja lido corretamente
    const impostoPercentual = Number(orcamento.imposto_percentual) || 0;
    const valorImposto = (subtotal * impostoPercentual) / 100;
    const valorFrete = Number(orcamento.frete) || 0;

    let valorDesconto = 0;
    if (orcamento.tipo_desconto === 'valor') {
        valorDesconto = Number(orcamento.desconto_valor) || 0;
    } else {
        const descontoPercentual = Number(orcamento.desconto_percentual) || 0;
        valorDesconto = (subtotal * descontoPercentual) / 100;
    }

    const valorTotal = subtotal + valorImposto + valorFrete - valorDesconto;

    return {
        servicos: servicosComUnitario,
        materiais: materiaisComUnitario,
        subtotalServicos,
        subtotalMateriais,
        subtotal,
        valorImposto,
        valorFrete,
        valorDesconto,
        valorTotal: Math.max(0, valorTotal), // Garante que o total não seja negativo
        temImposto: impostoPercentual > 0,
        temFrete: valorFrete > 0,
        temDesconto: valorDesconto > 0
    };
};

// --- COMPONENTE PRINCIPAL --- //
const LayoutInvestDigitalPdf = ({ orcamento, empresa, cliente }) => {
    const totais = calcularTotais(orcamento);
    const logoUrl = logoImage;

    // Dados da empresa para o cabeçalho e rodapé
    const empresaNome = empresa?.nome || 'INVEST SOLUÇÕES'; // Usado do PDF original
    const empresaCnpj = empresa?.cnpj || '28389598000171'; // Usado do PDF original
    const empresaResponsavel = empresa?.responsavel || 'Diretor Comercial';
    const fotos = orcamento.fotos && orcamento.fotos.length > 0 ? orcamento.fotos : [];

    return (
        <Document title={`Orçamento ${orcamento.numero_orcamento || 'INV-2025'}`}>
            {/* O wrap é mantido, mas o objetivo é que o conteúdo caiba na primeira página com os novos estilos */}
            <Page size="A4" style={styles.page} wrap>

                {/* --- CABEÇALHO --- */}
                <View style={styles.headerBar} fixed>
                    <Image style={styles.logo} src={logoUrl} />
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>{empresaNome}</Text>
                        <Text style={styles.companyDetails}>CNPJ: {empresaCnpj}</Text>
                        <Text style={styles.dateText}>Data: {formatDate(orcamento.data_orcamento)}</Text>
                    </View>
                </View>

                {/* --- TÍTULO DO ORÇAMENTO --- */}
                <View style={styles.orcamentoTitleContainer}>
                    <Text style={styles.orcamentoTitle}>
                        ORÇAMENTO <Text style={styles.orcamentoNumber}>#{orcamento.numero_orcamento || 'INV-2025'}</Text>
                    </Text>
                </View>

                {/* --- SEÇÃO DO CLIENTE --- */}
                <View style={styles.clientSection}>
                    <Text style={styles.sectionHeading}>Dados do Cliente</Text>
                    <View style={styles.clientInfoRow}>
                        <Text style={styles.clientLabel}>Nome/Fantasia:</Text>
                        <Text style={styles.clientValue}>{cliente?.nome_fantasia || cliente?.nome || 'N/A'}</Text>
                    </View>
                    {cliente?.razao_social && (
                        <View style={styles.clientInfoRow}>
                            <Text style={styles.clientLabel}>Razão Social:</Text>
                            <Text style={styles.clientValue}>{cliente?.razao_social}</Text>
                        </View>
                    )}
                    {cliente?.cnpj && (
                        <View style={styles.clientInfoRow}>
                            <Text style={styles.clientLabel}>CNPJ:</Text>
                            <Text style={styles.clientValue}>{cliente?.cnpj}</Text>
                        </View>
                    )}
                    {(cliente?.endereco || cliente?.numero || cliente?.bairro || cliente?.cidade || cliente?.estado || cliente?.cep) && (
                        <View style={styles.clientInfoRow}>
                            <Text style={styles.clientLabel}>Endereço Completo:</Text>
                            <Text style={styles.clientValue}>
                                {cliente?.endereco || ''}{cliente?.numero ? `, ${cliente.numero}` : ''}
                                {cliente?.bairro ? `, ${cliente.bairro}` : ''}
                                {cliente?.cidade ? ` - ${cliente.cidade}` : ''}{cliente?.estado ? `/${cliente.estado}` : ''}
                                {cliente?.cep ? ` - CEP: ${cliente.cep}` : ''}
                            </Text>
                        </View>
                    )}
                    {cliente?.email && (
                        <View style={styles.clientInfoRow}>
                            <Text style={styles.clientLabel}>Email:</Text>
                            <Text style={styles.clientValue}>{cliente?.email}</Text>
                        </View>
                    )}
                    {cliente?.telefone && (
                        <View style={styles.clientInfoRow}>
                            <Text style={styles.clientLabel}>Telefone:</Text>
                            <Text style={styles.clientValue}>{cliente?.telefone}</Text>
                        </View>
                    )}
                </View>

                {/* --- TABELA DE SERVIÇOS --- */}
                {totais.servicos && totais.servicos.length > 0 && (
                    <View style={styles.table} wrap={false}>
                        <Text style={styles.sectionHeading}>Serviços</Text>
                        <View style={styles.tableHeader}>
                            <Text style={styles.colDesc}>Descrição</Text>
                            <Text style={styles.colUn}>Un.</Text>
                            <Text style={styles.colPrecoUnit}>Preço Unit.</Text>
                            <Text style={styles.colQtd}>Qtd.</Text>
                            <Text style={styles.colPreco}>Total</Text>
                        </View>
                        {totais.servicos.map((item, index) => (
                            <View key={`serv-${index}`} style={styles.tableRow}>
                                <Text style={styles.colDesc}>{item.descricao}</Text>
                                <Text style={styles.colUn}>{item.unidade || 'un.'}</Text>
                                <Text style={styles.colPrecoUnit}>{formatCurrency(item.valor_unitario_calculado)}</Text>
                                <Text style={styles.colQtd}>{item.quantidade}</Text>
                                <Text style={styles.colPreco}>{formatCurrency(item.valor_total)}</Text>
                            </View>
                        ))}
                        <View style={styles.tableFooterRow}>
                            <Text style={styles.colDesc}>Total de Serviços</Text>
                            <Text style={styles.colUn}></Text>
                            <Text style={styles.colPrecoUnit}></Text>
                            <Text style={styles.colQtd}></Text>
                            <Text style={styles.colPreco}>{formatCurrency(totais.subtotalServicos)}</Text>
                        </View>
                    </View>
                )}

                {/* --- TABELA DE MATERIAIS --- */}
                {totais.materiais && totais.materiais.length > 0 && (
                    <View style={styles.table} wrap={false}>
                        <Text style={styles.sectionHeading}>Materiais</Text>
                        <View style={styles.tableHeader}>
                            <Text style={styles.colDesc}>Descrição</Text>
                            <Text style={styles.colUn}>Un.</Text>
                            <Text style={styles.colPrecoUnit}>Preço Unit.</Text>
                            <Text style={styles.colQtd}>Qtd.</Text>
                            <Text style={styles.colPreco}>Total</Text>
                        </View>
                        {totais.materiais.map((item, index) => (
                            <View key={`mat-${index}`} style={styles.tableRow}>
                                <Text style={styles.colDesc}>{item.descricao}</Text>
                                <Text style={styles.colUn}>{item.unidade || 'un.'}</Text>
                                <Text style={styles.colPrecoUnit}>{formatCurrency(item.valor_unitario_calculado)}</Text>
                                <Text style={styles.colQtd}>{item.quantidade}</Text>
                                <Text style={styles.colPreco}>{formatCurrency(item.valor_total)}</Text>
                            </View>
                        ))}
                        <View style={styles.tableFooterRow}>
                            <Text style={styles.colDesc}>Total de Materiais</Text>
                            <Text style={styles.colUn}></Text>
                            <Text style={styles.colPrecoUnit}></Text>
                            <Text style={styles.colQtd}></Text>
                            <Text style={styles.colPreco}>{formatCurrency(totais.subtotalMateriais)}</Text>
                        </View>
                    </View>
                )}

                {/* --- TOTAIS --- */}
                <View style={styles.totalsBox}>
                    {totais.servicos.length > 0 && (
                        <View style={styles.totalRow}>
                            <Text>Serviços:</Text>
                            <Text>{formatCurrency(totais.subtotalServicos)}</Text>
                        </View>
                    )}
                    {totais.materiais.length > 0 && (
                        <View style={styles.totalRow}>
                            <Text>Materiais:</Text>
                            <Text>{formatCurrency(totais.subtotalMateriais)}</Text>
                        </View>
                    )}
                    <View style={styles.totalRow}>
                        <Text>Subtotal:</Text>
                        <Text>{formatCurrency(totais.subtotal)}</Text>
                    </View>
                    {orcamento.imposto_percentual > 0 && totais.valorImposto > 0 && (
                        <View style={styles.totalRow}>
                            <Text>Imposto ({orcamento.imposto_percentual}%):</Text>
                            <Text>+ {formatCurrency(totais.valorImposto)}</Text>
                        </View>
                    )}
                    {orcamento.frete > 0 && totais.valorFrete > 0 && (
                        <View style={styles.totalRow}>
                            <Text>Frete:</Text>
                            <Text>+ {formatCurrency(totais.valorFrete)}</Text>
                        </View>
                    )}
                    {totais.temDesconto && (
                        <View style={styles.totalRow}>
                            <Text>Desconto:</Text>
                            <Text>- {formatCurrency(totais.valorDesconto)}</Text>
                        </View>
                    )}
                    <View style={styles.grandTotalRow}>
                        <Text>TOTAL:</Text>
                        <Text>{formatCurrency(totais.valorTotal)}</Text>
                    </View>
                </View>

                {/* --- INFORMAÇÕES ADICIONAIS --- */}
                {(orcamento.observacoes || orcamento.condicoes_pagamento || orcamento.meios_pagamento || orcamento.informacoes_adicionais) && (
                    <View style={styles.additionalInfoSection}>
                        {orcamento.observacoes && (
                            <View style={{ marginBottom: 5 }}>
                                <Text style={styles.sectionHeading}>Observações</Text>
                                <Text style={styles.additionalInfoText}>{orcamento.observacoes}</Text>
                            </View>
                        )}
                        {orcamento.condicoes_pagamento && (
                            <View style={{ marginBottom: 5 }}>
                                <Text style={styles.sectionHeading}>Condições de Pagamento</Text>
                                <Text style={styles.additionalInfoText}>{orcamento.condicoes_pagamento}</Text>
                            </View>
                        )}
                        {orcamento.meios_pagamento && (
                            <View style={{ marginBottom: 5 }}>
                                <Text style={styles.sectionHeading}>Meios de Pagamento</Text>
                                <Text style={styles.additionalInfoText}>{orcamento.meios_pagamento}</Text>
                            </View>
                        )}
                        {orcamento.informacoes_adicionais && (
                            <View style={{ marginBottom: 5 }}>
                                <Text style={styles.sectionHeading}>Informações Adicionais</Text>
                                <Text style={styles.additionalInfoText}>{orcamento.informacoes_adicionais}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* --- SEÇÃO DE FOTOS (Reduzida e sem quebra de página) --- */}
                {fotos && fotos.length > 0 && (
                    <View style={styles.photosSection} break>
                        <Text style={styles.sectionHeading}>Fotos do Orçamento</Text>
                        <View style={styles.photosGrid}>
                            {fotos.map((foto, index) => (
                                <View key={`photo-${index}`} style={styles.photoItem}>
                                    {/* Verifica se a URL da foto existe e é válida antes de renderizar */}
                                    {foto.url && <Image style={styles.photoImage} src={foto.url} />}
                                    {foto.data && <Text style={styles.photoCaption}>{formatDate(foto.data)}</Text>}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Assinaturas */}
                <View style={styles.signaturesSection} wrap={false}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureText}>{empresaResponsavel}</Text>
                        <Text style={styles.signatureText}>Invest Soluções</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureText}>{cliente?.nome_fantasia || cliente?.nome || 'Cliente'}</Text>
                        <Text style={styles.signatureText}>Assinatura do Cliente</Text>
                    </View>
                </View>

                {/* Rodapé */}
                <View style={styles.footer} fixed>
                    <Text>{empresaNome} - CNPJ: {empresaCnpj}</Text>
                    <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
                </View>
            </Page>

            {/* O bloco de renderização da página de fotos foi REMOVIDO para garantir 1 página */}

        </Document>
    );
};

export default LayoutInvestDigitalPdf;