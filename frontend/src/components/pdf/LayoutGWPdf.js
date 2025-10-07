import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import logoImage from '../../assets/gw-logo.jpg'; // Certifique-se de que o caminho está correto

// Ícones para contato (pode ser substituído por SVGs ou componentes se preferir)
const emailIconUrl = 'https://cdn-icons-png.flaticon.com/512/732/732200.png';
const phoneIconUrl = 'https://cdn-icons-png.flaticon.com/512/724/724664.png';

// Nova paleta de cores: Azul, Amarelo, Preto
const primaryColor = '#2e3486'; // Azul
const secondaryColor = '#dcd657'; // Amarelo
const textColor = '#000000'; // Preto
const lightTextColor = '#333333'; // Cinza escuro para detalhes
const backgroundColor = '#F8F8F8'; // Fundo levemente cinza

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 8, // Reduzido para caber em uma página
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 30,
        color: textColor,
        backgroundColor: '#FFFFFF', // Fundo da página deve ser branco
    },
    // --- CABEÇALHO --- //
    headerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: primaryColor,
        paddingBottom: 8,
    },
    headerLeft: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: '50%',
    },
    headerRight: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        width: '50%',
    },
    logo: {
        width: 100, // Tamanho ajustado
        height: 'auto',
        marginBottom: 3,
    },
    companyName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: primaryColor,
    },
    companyDetails: {
        fontSize: 7,
        color: lightTextColor,
        lineHeight: 1.2,
    },
    contactInfo: {
        fontSize: 8,
        color: lightTextColor,
        lineHeight: 1.4,
        textAlign: 'right',
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 1,
    },
    icon: {
        width: 8,
        height: 8,
        marginRight: 3,
    },
    dateText: {
        fontSize: 9, // Mais ênfase na data
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 3,
        color: primaryColor,
    },

    // --- TÍTULO DO ORÇAMENTO --- //
    orcamentoTitleContainer: {
        backgroundColor: primaryColor,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 15,
        borderRadius: 3,
    },
    orcamentoTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    orcamentoSubtitle: {
        color: '#FFFFFF',
        fontSize: 9,
        textAlign: 'center',
        marginTop: 2,
    },

    // --- SEÇÃO DO CLIENTE --- //
    clientSection: {
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: backgroundColor,
    },
    sectionHeading: {
        fontSize: 10,
        fontWeight: 'bold',
        color: primaryColor,
        marginBottom: 6,
    },
    clientInfoRow: {
        flexDirection: 'row',
        marginBottom: 3,
    },
    clientLabel: {
        fontWeight: 'bold',
        width: '25%', // Ajustado para melhor alinhamento
        fontSize: 8,
    },
    clientValue: {
        width: '75%',
        fontSize: 8,
    },

    // --- TABELAS DE ITENS (Serviços/Materiais) --- //
    table: {
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: secondaryColor,
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#DDDDDD',
        fontWeight: 'bold',
        fontSize: 8,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        fontSize: 8,
    },
    tableFooterRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 8,
        fontWeight: 'bold',
        fontSize: 8,
    },
    colDesc: { width: '40%' },
    colUn: { width: '10%', textAlign: 'center' },
    colPrecoUnit: { width: '18%', textAlign: 'right' },
    colQtd: { width: '12%', textAlign: 'center' },
    colPreco: { width: '20%', textAlign: 'right' },

    // --- TOTAIS --- //
    totalsSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        marginBottom: 15,
    },
    totalsBox: {
        width: '45%', // Ajustado para melhor distribuição
        borderWidth: 1,
        borderColor: backgroundColor,
        borderRadius: 3,
        overflow: 'hidden',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    totalRowLast: {
        borderBottomWidth: 0,
    },
    totalLabel: {
        fontSize: 9,
        color: textColor,
    },
    totalValue: {
        fontSize: 9,
        fontWeight: 'bold',
        color: textColor,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 7,
        paddingHorizontal: 10,
        backgroundColor: primaryColor,
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 11,
    },

    // --- INFORMAÇÕES ADICIONAIS --- //
    additionalInfoSection: {
        marginBottom: 15,
    },
    additionalInfoText: {
        fontSize: 8,
        lineHeight: 1.4,
        color: lightTextColor,
    },

    // --- ASSINATURAS --- //
    signaturesSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 30,
        marginBottom: 20,
        textAlign: 'center',
    },
    signatureBox: {
        width: '45%',
        borderTopWidth: 1,
        borderTopColor: lightTextColor,
        paddingTop: 8,
    },
    signatureText: {
        fontSize: 8,
        color: textColor,
    },

    // --- RODAPÉ --- //
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
        backgroundColor: primaryColor,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        color: '#FFFFFF',
        fontSize: 7,
    },
    pageNumber: {
        position: 'absolute',
        fontSize: 7,
        bottom: 10,
        right: 30,
        textAlign: 'right',
        color: lightTextColor,
    },

    // --- SEÇÃO DE FOTOS --- //
    photosSection: {
        marginTop: 15,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: backgroundColor,
        pageBreakBefore: 'always', // Força nova página para fotos
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    photoItem: {
        width: '32%', // 3 fotos por linha
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        padding: 3,
        borderRadius: 2,
    },
    photoImage: {
        width: '100%',
        height: 80, // Altura ajustada
        objectFit: 'cover',
        borderRadius: 1,
    },
    photoCaption: {
        fontSize: 6,
        textAlign: 'center',
        marginTop: 3,
        color: lightTextColor,
    },
});

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('pt-BR');
    
    let date;
    // Verificar se a string de data contém o formato MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
    if (typeof dateString === 'string' && dateString.includes(' ')) {
        // Converter o formato MySQL (YYYY-MM-DD HH:MM:SS) para o formato ISO (YYYY-MM-DDTHH:MM:SS)
        const isoDateString = dateString.replace(' ', 'T');
        date = new Date(isoDateString);
    } else {
        date = new Date(dateString);
    }
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
        console.warn(`Data inválida: ${dateString}`);
        return new Date().toLocaleDateString('pt-BR');
    }
    
    return date.toLocaleDateString('pt-BR');
};

const calcularTotais = (orcamento) => {
    const calcularPrecoUnitario = (item) => {
        if (Number(item.valor_unitario) > 0) {
            return Number(item.valor_unitario);
        }
        const total = Number(item.valor_total) || 0;
        const qtd = Number(item.quantidade) || 1;
        return total / qtd;
    };

    const servicosComUnitario = (orcamento.servicos || []).map(servico => ({
        ...servico,
        valor_unitario_calculado: calcularPrecoUnitario(servico),
        valor_total: Number(servico.valor_total) || 0,
    }));

    const materiaisComUnitario = (orcamento.materiais || []).map(material => ({
        ...material,
        valor_unitario_calculado: calcularPrecoUnitario(material),
        valor_total: Number(material.valor_total) || 0,
    }));

    const subtotalServicos = servicosComUnitario.reduce((acc, servico) => acc + servico.valor_total, 0);
    const subtotalMateriais = materiaisComUnitario.reduce((acc, material) => acc + material.valor_total, 0);
    const subtotal = subtotalServicos + subtotalMateriais;

    const valorImposto = (subtotal * (Number(orcamento.imposto_percentual) || 0)) / 100;
    const valorFrete = Number(orcamento.frete) || 0;

    let valorDesconto = 0;
    if (orcamento.tipo_desconto === 'valor') {
        valorDesconto = Number(orcamento.desconto_valor) || 0;
    } else {
        valorDesconto = (subtotal * (Number(orcamento.desconto_percentual) || 0)) / 100;
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
        valorTotal: Math.max(0, valorTotal),
        temImposto: (Number(orcamento.imposto_percentual) || 0) > 0,
        temFrete: (Number(orcamento.frete) || 0) > 0,
        temDesconto: valorDesconto > 0
    };
};

// --- COMPONENTE PRINCIPAL --- //
const LayoutGWPdf = ({ orcamento, empresa, cliente }) => {
    const totais = calcularTotais(orcamento);
    const logoUrl = logoImage;

    // Dados da empresa para o cabeçalho e rodapé
    const empresaNome = empresa?.nome || 'GW SOLUÇÕES LTDA';
    const empresaCnpj = empresa?.cnpj || '54.153.847/0001-35';
    const empresaEndereco = empresa?.endereco || 'Avenida Belo Horizonte, 21';
    const empresaCidadeEstado = `${empresa?.cidade || 'Marcilio de Noronha'}, ${empresa?.estado || 'ES'}`;
    const empresaCep = empresa?.cep || '29135-470';
    const empresaEmail = empresa?.email || 'wallaslovatti@yahoo.com.br';
    const empresaTelefone1 = empresa?.telefone || '+55 (27) 99745-8265';
    const empresaTelefone2 = empresa?.telefone_secundario || '+55 (27) 98851-4192';
    const empresaInstagram = empresa?.instagram || '@gwsolucoes';
    const empresaResponsavel = empresa?.responsavel || 'Diretor Comercial';

    // Fotos do orçamento (usando dados reais se existirem, ou array vazio se não houver)
    const fotos = orcamento.fotos && orcamento.fotos.length > 0 ? orcamento.fotos : [];

    return (
        <Document title={`Orçamento ${orcamento.numero_orcamento || 'GW-2025'}`}>
            <Page size="A4" style={styles.page} wrap>

                {/* --- CABEÇALHO --- */}
                <View style={styles.headerSection} fixed>
                    <View style={styles.headerLeft}>
                        <Image style={styles.logo} src={logoUrl} />
                        <Text style={styles.companyName}>{empresaNome}</Text>
                        <Text style={styles.companyDetails}>CNPJ: {empresaCnpj}</Text>
                        <Text style={styles.companyDetails}>{empresaEndereco}</Text>
                        <Text style={styles.companyDetails}>{empresaCidadeEstado} - CEP: {empresaCep}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.dateText}>{formatDate(orcamento.data_orcamento)}</Text>
                        <View style={styles.contactRow}>
                            <Image style={styles.icon} src={emailIconUrl} />
                            <Text style={styles.contactInfo}>{empresaEmail}</Text>
                        </View>
                        <View style={styles.contactRow}>
                            <Image style={styles.icon} src={phoneIconUrl} />
                            <Text style={styles.contactInfo}>{empresaTelefone1}</Text>
                        </View>
                        {empresaTelefone2 && (
                            <View style={styles.contactRow}>
                                <Image style={styles.icon} src={phoneIconUrl} />
                                <Text style={styles.contactInfo}>{empresaTelefone2}</Text>
                            </View>
                        )}
                        {empresaInstagram && (
                            <Text style={styles.contactInfo}>{empresaInstagram}</Text>
                        )}
                    </View>
                </View>

                {/* --- TÍTULO DO ORÇAMENTO --- */}
                <View style={styles.orcamentoTitleContainer}>
                    <Text style={styles.orcamentoTitle}>ORÇAMENTO #{orcamento.numero_orcamento || 'GW-2025'}</Text>
                    {orcamento.referencia && (
                        <Text style={styles.orcamentoSubtitle}>{orcamento.referencia}</Text>
                    )}
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
                <View style={styles.totalsSection}>
                    <View style={styles.totalsBox}>
                        {totais.subtotalServicos > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Serviços:</Text>
                                <Text style={styles.totalValue}>{formatCurrency(totais.subtotalServicos)}</Text>
                            </View>
                        )}
                        {totais.subtotalMateriais > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Materiais:</Text>
                                <Text style={styles.totalValue}>{formatCurrency(totais.subtotalMateriais)}</Text>
                            </View>
                        )}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal:</Text>
                            <Text style={styles.totalValue}>{formatCurrency(totais.subtotal)}</Text>
                        </View>
                        {totais.temImposto && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Imposto ({orcamento.imposto_percentual || 0}%):</Text>
                                <Text style={styles.totalValue}>+ {formatCurrency(totais.valorImposto)}</Text>
                            </View>
                        )}
                        {totais.temFrete && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Frete:</Text>
                                <Text style={styles.totalValue}>+ {formatCurrency(totais.valorFrete)}</Text>
                            </View>
                        )}
                        {totais.temDesconto && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Desconto:</Text>
                                <Text style={styles.totalValue}>- {formatCurrency(totais.valorDesconto)}</Text>
                            </View>
                        )}
                        <View style={styles.grandTotalRow}>
                            <Text>VALOR TOTAL:</Text>
                            <Text>{formatCurrency(totais.valorTotal)}</Text>
                        </View>
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

                {/* --- ASSINATURAS --- */}
                <View style={styles.signaturesSection} wrap={false}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureText}>{empresaResponsavel}</Text>
                        <Text style={styles.signatureText}>GW Soluções</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureText}>{cliente?.nome_fantasia || cliente?.nome || 'Cliente'}</Text>
                        <Text style={styles.signatureText}>Assinatura do Cliente</Text>
                    </View>
                </View>

                {/* --- NÚMERO DA PÁGINA --- */}
                <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                    `Página ${pageNumber} de ${totalPages}`
                )} fixed />

                {/* --- RODAPÉ GERAL --- */}
                <View style={styles.footer} fixed>
                    <Text>{empresaNome} - CNPJ: {empresaCnpj}</Text>
                    <Text>{empresaInstagram}</Text>
                </View>

            </Page>

            {/* --- SEÇÃO DE FOTOS (NOVA PÁGINA) --- */}
            {fotos && fotos.length > 0 && (
                <Page size="A4" style={styles.page}>
                    <View style={styles.photosSection}>
                        <Text style={styles.sectionHeading}>Fotos do Orçamento</Text>
                        <View style={styles.photosGrid}>
                            {fotos.map((foto, index) => (
                                <View key={`photo-${index}`} style={styles.photoItem}>
                                    <Image style={styles.photoImage} src={foto.url} />
                                    {foto.data && <Text style={styles.photoCaption}>{formatDate(foto.data)}</Text>}
                                </View>
                            ))}
                        </View>
                    </View>
                    {/* Rodapé e número da página para a página de fotos */}
                    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                        `Página ${pageNumber} de ${totalPages}`
                    )} fixed />
                    {/* Rodapé para a página de fotos */}
                    <View style={styles.footer} fixed>
                        <Text>{empresaNome} - CNPJ: {empresaCnpj}</Text>
                        <Text>{empresaInstagram}</Text>
                    </View>
                </Page>
            )}

        </Document>
    );
};

export default LayoutGWPdf;
