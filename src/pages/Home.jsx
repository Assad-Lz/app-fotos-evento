import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Download, AlertCircle, Loader2, X, Clock, ExternalLink } from 'lucide-react';

// IMAGEM DO BONECO
import bonecoMM from '../imgs/boneco_vermelho_mm.png';

// NOVAS LOGOS PARA O BACKGROUND (SVG)
import logoMM from '../imgs/MMS_MARCA.svg';
import logoSnickers from '../imgs/SNICKERS_MARCA.PNG';
import logoTwix from '../imgs/TWIX_MARCA.PNG';

const COOLDOWN_MINUTES = 10;
const COOLDOWN_TIME = COOLDOWN_MINUTES * 60 * 1000;

export default function Home() {
    const [numero, setNumero] = useState('');
    const [dia, setDia] = useState('07');
    const [foto, setFoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [erro, setErro] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [minutosRestantes, setMinutosRestantes] = useState(0);

    const marcasParaFaixa = [...Array(6)].flatMap(() => [
        { src: logoMM, height: 'h-24', rotate: 'rotate-12' },
        { src: logoSnickers, height: 'h-14', rotate: '-rotate-6' },
        { src: logoTwix, height: 'h-16', rotate: 'rotate-12' }
    ]);

    const obterTempoRestante = (num, d) => {
        const lastDownload = localStorage.getItem(`ld_${d}_${num}`);
        if (lastDownload) {
            const diff = Date.now() - parseInt(lastDownload);
            if (diff < COOLDOWN_TIME) {
                return Math.ceil((COOLDOWN_TIME - diff) / 60000);
            }
        }
        return 0;
    };

    async function buscarFoto(e) {
        e.preventDefault();
        if (!numero) return;

        const tempo = obterTempoRestante(numero, dia);
        if (tempo > 0) {
            setMinutosRestantes(tempo);
            setShowModal(true);
            return;
        }

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
                setFoto(data[data.length - 1].url_imagem);
            } else {
                setErro(`Foto ${numero} não encontrada no dia ${dia}.`);
            }
        } catch (err) {
            setErro('Erro de conexão.');
        } finally {
            setLoading(false);
        }
    }

    // --- FUNÇÃO DE DOWNLOAD COM DEBUG E CACHE BUSTER ---
    async function baixarImagem(url, nomeFoto) {
        setDownloading(true);

        // 1. TRUQUE DO CACHE BUSTER:
        // Adiciona um timestamp na URL para garantir que o navegador/Cloudflare
        // não entregue uma versão velha "sem headers" do cache.
        const urlComCacheBuster = `${url}?cache_bypass=${Date.now()}`;

        console.group("🔍 DEBUG DOWNLOAD");
        console.log("1. URL Original:", url);
        console.log("2. URL Fresca (Buster):", urlComCacheBuster);

        try {
            console.log("3. Iniciando Fetch...");
            const response = await fetch(urlComCacheBuster, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    // Tenta forçar o Cloudflare a não usar cache
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });

            console.log("4. Status da Resposta:", response.status);
            console.log("5. Headers Recebidos:", [...response.headers.entries()]);

            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

            const blob = await response.blob();
            console.log("6. Blob criado com sucesso. Tamanho:", blob.size);

            const urlBlob = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = urlBlob;
            link.setAttribute('download', `FOTO_DIA${dia}_${nomeFoto}.jpg`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(urlBlob);

            console.log("7. Download disparado com sucesso!");
            console.groupEnd();

            // Sucesso
            localStorage.setItem(`ld_${dia}_${numero}`, Date.now().toString());
            setTimeout(() => { setFoto(null); setNumero(''); }, 3000);

        } catch (err) {
            console.error("❌ ERRO NO DOWNLOAD:", err);
            console.groupEnd();

            // Fallback para o usuário não ficar na mão
            window.open(url, '_blank');
            alert("⚠️ Bloqueio detectado! A foto foi aberta em nova aba. Segure nela para salvar.");
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#ffcc00] flex flex-col items-center relative overflow-hidden font-sans">

            <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none select-none">
                <div className="w-[300%] flex gap-32 animate-marquee whitespace-nowrap py-16 items-center -rotate-[15deg]">
                    {marcasParaFaixa.map((marca, i) => (
                        <img key={i} src={marca.src} className={`${marca.height} w-auto drop-shadow-xl ${marca.rotate} shrink-0`} alt="Brand" />
                    ))}
                </div>
            </div>

            <div className="z-20 w-full flex flex-col items-center px-4">
                <header className="flex flex-col items-center pt-12 pb-8">
                    <div className="bg-[#df0024] p-5 rounded-full mb-4 shadow-[0_8px_0_0_#a0001a] border-4 border-white animate-bounce">
                        <img src={bonecoMM} className="w-12 h-12 object-contain" alt="M&M" />
                    </div>
                    <h1 className="text-4xl font-[900] text-[#4e3629] tracking-tighter text-center uppercase italic">
                        Ache sua <span className="text-[#0072bc]">Foto!</span>
                    </h1>
                </header>

                <div className="w-full max-w-md bg-white p-8 rounded-[3rem] shadow-[0_12px_0_0_#4e3629] border-4 border-[#4e3629] mb-12">
                    <form onSubmit={buscarFoto} className="flex flex-col gap-6">
                        <div className="flex bg-[#4e3629] p-2 rounded-full border-2 border-[#4e3629]">
                            {['07', '08'].map(d => (
                                <button key={d} type="button" onClick={() => { setDia(d); setFoto(null); setErro(''); }}
                                    className={`flex-1 py-3 rounded-full font-black text-xs transition-all ${dia === d ? 'bg-[#0072bc] text-white shadow-md' : 'text-gray-300'}`}>
                                    DIA {d}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <input type="number" placeholder="Número da foto" value={numero} onChange={(e) => setNumero(e.target.value)}
                                className="w-full p-5 pl-14 bg-gray-100 border-4 border-gray-200 rounded-3xl outline-none focus:border-[#ffcc00] text-2xl font-black text-[#4e3629]" />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#4e3629]" size={24} />
                        </div>

                        <button disabled={loading} className={`w-full p-5 rounded-3xl font-black text-xl text-white shadow-[0_8px_0_0_#a0001a] active:scale-95 ${loading ? 'bg-gray-400' : 'bg-[#df0024]'}`}>
                            {loading ? <div className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> BUSCANDO...</div> : 'VER MINHA FOTO 🍫'}
                        </button>
                    </form>

                    {erro && (
                        <div className="mt-6 p-4 bg-yellow-100 text-[#4e3629] rounded-2xl flex items-center gap-3 border-2 border-[#ffcc00] animate-in fade-in">
                            <AlertCircle size={20} className="text-[#df0024]" />
                            <p className="text-sm font-bold">{erro}</p>
                        </div>
                    )}

                    {foto && (
                        <div className="mt-8 animate-in zoom-in duration-300 flex flex-col gap-4">
                            <div className="relative rounded-[2rem] overflow-hidden border-8 border-gray-100 shadow-2xl">
                                <img src={foto} alt="Sua foto" className="w-full h-auto" />
                            </div>

                            <button onClick={() => baixarImagem(foto, numero)} disabled={downloading}
                                className="flex items-center justify-center gap-2 w-full p-5 bg-[#00aa55] text-white rounded-3xl font-black text-xl shadow-[0_8px_0_0_#007a3d] hover:bg-[#00c060] active:translate-y-1 active:shadow-none transition-all">
                                {downloading ? <Loader2 className="animate-spin" /> : <Download size={24} />}
                                {downloading ? 'BAIXANDO...' : 'BAIXAR FOTO'}
                            </button>

                            <a href={foto} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full p-4 bg-white border-4 border-[#0072bc] text-[#0072bc] rounded-3xl font-black text-sm uppercase hover:bg-blue-50 transition-all text-center">
                                <ExternalLink size={16} />
                                Não baixou? Abrir Foto
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#4e3629]/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] border-4 border-[#4e3629] shadow-[0_15px_0_0_#4e3629] overflow-hidden animate-in zoom-in duration-300">
                        <div className="bg-[#0072bc] p-6 flex flex-col items-center relative">
                            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={24} /></button>
                            <div className="bg-white p-4 rounded-full shadow-lg mb-4"><Clock size={40} className="text-[#df0024]" /></div>
                            <h2 className="text-2xl font-[900] text-white italic uppercase tracking-tighter">Calma lá! 🍫</h2>
                        </div>
                        <div className="p-8 text-center">
                            <p className="text-[#4e3629] font-bold text-lg leading-tight mb-6">Você já baixou essa foto. Tente novamente em {COOLDOWN_MINUTES} minutos.</p>
                            <div className="bg-gray-100 p-4 rounded-2xl mb-8">
                                <p className="text-xs font-black text-[#0072bc] uppercase tracking-widest mb-1">Tempo Restante</p>
                                <p className="text-3xl font-black text-[#4e3629]">{minutosRestantes} MIN</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-full p-4 bg-[#df0024] text-white rounded-2xl font-black text-lg shadow-[0_6px_0_0_#a0001a] active:scale-95 transition-all">ENTENDI!</button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 30s linear infinite; }`}</style>
        </div>
    );
}