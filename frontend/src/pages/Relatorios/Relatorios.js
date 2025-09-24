import React from 'react';
import { FaUser, FaUserCog, FaCheckCircle, FaExclamationTriangle, FaTruck, FaChartBar, FaChartLine, FaClock, FaTags } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import './Relatorios.css';

const Relatorios = () => {
    // Array de objetos para renderizar os cards de relatórios
    const reportList = [
        {
            title: 'Atendimentos por Cliente',
            icon: <FaUser />,
            link: '/relatorios/por-cliente'
        },
        {
            title: 'Atendimentos por Técnico',
            icon: <FaUserCog />,
            link: '/relatorios/por-tecnico'
        },
        {
            title: 'Atendimentos Concluídos',
            icon: <FaCheckCircle />,
            link: '/relatorios/concluidos'
        },
        {
            title: 'Atendimentos Pendentes',
            icon: <FaExclamationTriangle />,
            link: '/relatorios/pendentes'
        },
        {
            title: 'Visitas Técnicas',
            icon: <FaTruck />,
            link: '/relatorios/visitas-tecnicas'
        },
        {
            title: 'Desempenho por Técnico',
            icon: <FaChartBar />,
            link: '/relatorios/desempenho-tecnico'
        },
        {
            title: 'Volume de Chamados Abertos',
            icon: <FaChartLine />,
            link: '/relatorios/volume-abertos'
        },
        {
            title: 'Volume de Chamados Fechados',
            icon: <FaChartLine />,
            link: '/relatorios/volume-fechados'
        },
        {
            title: 'Tempo Médio de Atendimento (TMA)',
            icon: <FaClock />,
            link: '/relatorios/tma'
        },
        {
            title: 'Atendimentos por Canal/Tipo',
            icon: <FaTags />,
            link: '/relatorios/por-canal-tipo'
        },
    ];

    return (
        <Layout>
            <div className="reports-container">
                <div className="reports-header">
                    <h1>Relatórios Gerenciais</h1>
                    <p>Selecione um dos relatórios abaixo para visualizar os dados.</p>
                </div>

                <div className="reports-grid">
                    {reportList.map((report, index) => (
                        <Link to={report.link} key={index} className="report-card">
                            <div className="report-icon-box">{report.icon}</div>
                            <h3>{report.title}</h3>
                        </Link>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default Relatorios;