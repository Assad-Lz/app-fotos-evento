import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Download, AlertCircle, Camera, Loader2 } from 'lucide-react';


// IMPORTAÇÃO DAS IMAGENS
import bonecoMM from '../imgs/boneco_vermelho_mm.png';
import pacoteMM from '../imgs/PacotedeMM.png';
import logoSnickers from '../imgs/LogoSnickers.png';
import barraSnickers from '../imgs/barrasnickers.png';

export default function Home() {
    const [numero, setNumero] = useState('');
    const [dia, setDia] = useState('07');
    const [foto, setFoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [erro, setErro] = useState('');

    async function buscarFoto(e) {
        e.preventDefault();
        if (!numero) return;
        setLoading(true);
        setErro('');
        setFoto(null);

        try {
            const { data, error } = await supabase
                .from('fotos')
                .select('url_imagem')
                .eq('numero_foto', parseInt(numero))
                .eq('dia_evento', dia);

            if (error) throw error;
            if (data && data.length > 0) {
                // Pega a última entrada caso haja duplicidade
                setFoto(data[data.length - 1].url_imagem);
            } else {
                setErro('Putz! Foto não encontrada. Veja se o número está certo!');
            }
        } catch (err) {
            console.error(err);
            setErro('Erro na busca. Tente de novo!');
        } finally {
            setLoading(false);
        }
    }

    async function baixarImagem(url, nomeFoto) {
        setDownloading(true);
        try {
            const resposta = await fetch(url, { mode: 'cors' });
            if (!resposta.ok) throw new Error('Falha ao acessar a imagem');

            const blob = await resposta.blob();
            const urlBlob = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = urlBlob;
            link.setAttribute('download', `MMS_SNICKERS_FOTO_${nomeFoto}.jpg`);
            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(urlBlob);
        } catch (err) {
            console.error("Download falhou, abrindo fallback:", err);
            window.open(url, '_blank');
            alert("A foto abriu em uma nova aba! Segure o dedo nela para salvar na galeria! 🍫");
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#ffcc00] flex flex-col items-center relative overflow-hidden font-sans">

            {/* FAIXA GSAP/CSS INFINITA - BACKGROUND CENTRALIZADO */}
            {/* Mudei 'top-24' para 'top-1/2 -translate-y-1/2' para centralizar verticalmente */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full opacity-30 pointer-events-none -rotate-6">
                <div className="w-[200%] flex gap-24 animate-marquee whitespace-nowrap py-4 items-center">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex gap-24 items-center">
                            <img src={bonecoMM} className="h-20 w-auto drop-shadow-md rotate-6" alt="boneco" />
                            <img src={logoSnickers} className="h-12 w-auto" alt="logo" />
                            <img src={pacoteMM} className="h-24 w-auto -rotate-3" alt="pacote" />
                            <img src={barraSnickers} className="h-10 w-auto rotate-12" alt="barra" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="z-20 w-full flex flex-col items-center px-4">
                <header className="flex flex-col items-center pt-12 pb-8">
                    <div className="bg-[#df0024] p-5 rounded-full mb-4 shadow-[0_8px_0_0_#a0001a] border-4 border-white animate-bounce">
                        <Camera size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-[900] text-[#4e3629] tracking-tighter text-center uppercase italic">
                        Ache sua <span className="text-[#0072bc]">Foto!</span>
                    </h1>
                </header>

                <div className="w-full max-w-md bg-white p-8 rounded-[3rem] shadow-[0_12px_0_0_#4e3629] border-4 border-[#4e3629] mb-12">
                    <form onSubmit={buscarFoto} className="flex flex-col gap-6">
                        {/* Seletor de Dia Snickers Style */}
                        <div className="flex bg-[#4e3629] p-2 rounded-full border-2 border-[#4e3629]">
                            <button
                                type="button"
                                onClick={() => setDia('07')}
                                className={`flex-1 py-3 rounded-full font-black text-xs transition-all ${dia === '07' ? 'bg-[#0072bc] text-white shadow-[0_4px_0_0_#004a7a]' : 'text-gray-300'
                                    }`}
                            >
                                DIA 07
                            </button>
                            <button
                                type="button"
                                onClick={() => setDia('08')}
                                className={`flex-1 py-3 rounded-full font-black text-xs transition-all ${dia === '08' ? 'bg-[#0072bc] text-white shadow-[0_4px_0_0_#004a7a]' : 'text-gray-300'
                                    }`}
                            >
                                DIA 08
                            </button>
                        </div>

                        {/* Input por Número */}
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="Número da foto"
                                value={numero}
                                onChange={(e) => setNumero(e.target.value)}
                                className="w-full p-5 pl-14 bg-gray-100 border-4 border-gray-200 rounded-3xl outline-none focus:border-[#ffcc00] text-2xl font-black text-[#4e3629] placeholder:text-gray-300 transition-all"
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#4e3629]" size={24} />
                        </div>

                        <button
                            disabled={loading}
                            className={`w-full p-5 rounded-3xl font-black text-xl text-white transition-all active:scale-95 shadow-[0_8px_0_0_#a0001a] ${loading ? 'bg-gray-400 shadow-none' : 'bg-[#df0024] hover:bg-[#ff002a]'
                                }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="animate-spin" /> BUSCANDO...
                                </div>
                            ) : 'VER MINHA FOTO 🍫'}
                        </button>
                    </form>

                    {erro && (
                        <div className="mt-6 p-4 bg-yellow-100 text-[#4e3629] rounded-2xl flex items-center gap-3 border-2 border-[#ffcc00] animate-in fade-in">
                            <AlertCircle size={20} className="text-[#df0024]" />
                            <p className="text-sm font-bold">{erro}</p>
                        </div>
                    )}

                    {foto && (
                        <div className="mt-8 animate-in zoom-in duration-300">
                            <div className="relative rounded-[2rem] overflow-hidden border-8 border-gray-100 shadow-2xl">
                                <img src={foto} alt="Sua foto encontrada" className="w-full h-auto" />
                            </div>

                            <button
                                onClick={() => baixarImagem(foto, numero)}
                                disabled={downloading}
                                className="mt-6 flex items-center justify-center gap-2 w-full p-5 bg-[#00aa55] text-white rounded-3xl font-black text-xl shadow-[0_8px_0_0_#007a3d] active:scale-95 transition-all hover:bg-[#00c060]"
                            >
                                {downloading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Download size={24} />
                                )}
                                {downloading ? 'BAIXANDO...' : 'BAIXAR FOTO'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <footer className="mt-auto py-8 z-10">
                <p className="text-[#4e3629] text-[10px] font-black tracking-widest uppercase opacity-50 text-center">
                    M&M's & SNICKERS Stand • 2026
                </p>
            </footer>

            {/* ESTILO DA ANIMAÇÃO INFINITA */}
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    );
}