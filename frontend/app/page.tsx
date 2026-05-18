'use client'

import { useEffect, useState, useRef } from 'react'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' }

interface FeedEntry {
  timestamp: string
  message: string
  type: string
}

interface Trade {
  id: string
  symbol: string
  strategy: string
  confidence: number
  size: string
  status: string
  entry_price: number
  current_price: number
  pnl_pct: number
  entry_time: string
}

interface Stats {
  total_trades: number
  open_trades: number
  closed_trades: number
  win_rate: number
  smart_wallets_tracked: number
  cycle_count: number
  strategies: Record<string, { active: boolean; trades: number; wins: number }>
  custom_strategies: any[]
}

interface StrategyParams {
  [key: string]: Record<string, any>
}

export default function Dashboard() {
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [params, setParams] = useState<StrategyParams>({})
  const [chat, setChat] = useState<{ role: string; text: string }[]>([
    {
      role: 'specter',
      text: 'Specter online. I am scanning Solana for opportunities. Ask me anything about signals, trades, or strategies.',
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [editedParams, setEditedParams] = useState<Record<string, Record<string, number>>>({})
  const [showStrategyModal, setShowStrategyModal] = useState(false)
  const [strategyDesc, setStrategyDesc] = useState('')
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [strategyResponse, setStrategyResponse] = useState('')
  const [paperMode, setPaperMode] = useState(true)
  const [paperBalance, setPaperBalance] = useState(10)
  const [depositAmount, setDepositAmount] = useState('')
  const [showDeposit, setShowDeposit] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch(`\${BACKEND}/feed`, { headers: NGROK_HEADERS })
        const data = await res.json()
        setFeed(data.feed || [])
      } catch {}
    }
    fetchFeed()
    const interval = setInterval(fetchFeed, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`\${BACKEND}/stats`, { headers: NGROK_HEADERS })
        const data = await res.json()
        setStats(data)
      } catch {}
    }
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch(`\${BACKEND}/trades`, { headers: NGROK_HEADERS })
        const data = await res.json()
        setTrades(data.trades || [])
      } catch {}
    }
    fetchTrades()
    const interval = setInterval(fetchTrades, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchParams = async () => {
      try {
        const res = await fetch(`\${BACKEND}/strategy/params`, { headers: NGROK_HEADERS })
        const data = await res.json()
        setParams(data)
        const initial: Record<string, Record<string, number>> = {}
        Object.keys(data).forEach((strategy) => {
          initial[strategy] = {}
          Object.keys(data[strategy]).forEach((param) => {
            if (typeof data[strategy][param] === 'number') {
              initial[strategy][param] = data[strategy][param]
            }
          })
        })
        setEditedParams(initial)
      } catch {}
    }
    fetchParams()
  }, [])

  const toggleStrategy = async (strategy: string, active: boolean) => {
    try {
      await fetch(`\${BACKEND}/strategy/toggle`, { headers: { ...NGROK_HEADERS, 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ strategy, active }),
      })
    } catch {}
  }

  const saveParams = async (strategy: string) => {
    const paramsToSave = editedParams[strategy] || {}
    for (const [param, value] of Object.entries(paramsToSave)) {
      try {
        await fetch(`\${BACKEND}/strategy/params/update`, { headers: { ...NGROK_HEADERS, "Content-Type": "application/json" },
          method: 'POST',
          body: JSON.stringify({ strategy, param, value }),
        })
      } catch {}
    }
    setExpandedStrategy(null)
  }

  const sendChat = async (overrideMessage?: string) => {
    const msg = (overrideMessage ?? chatInput).trim()
    if (!msg || chatLoading) return
    if (!overrideMessage) setChatInput('')
    setChat((prev) => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)
    try {
      const res = await fetch(`\${BACKEND}/chat`, { headers: { ...NGROK_HEADERS, 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      setChat((prev) => [...prev, { role: 'specter', text: data.response }])
    } catch {
      setChat((prev) => [...prev, { role: 'specter', text: 'Connection error. Try again.' }])
    }
    setChatLoading(false)
  }

  const connectWallet = async () => {
    setWalletConnected(true)
    setWalletAddress('7xKX...9mPQ')
    await sendChat('Wallet connected: 7xKX...9mPQ with 10.00 SOL paper balance.')
  }

  const createStrategy = async () => {
    if (!strategyDesc.trim() || strategyLoading) return
    setStrategyLoading(true)
    try {
      const res = await fetch(`\${BACKEND}/strategy/create`, { headers: { ...NGROK_HEADERS, 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ description: strategyDesc }),
      })
      const data = await res.json()
      setStrategyResponse(data.response)
    } catch {
      setStrategyResponse('Error creating strategy. Try again.')
    }
    setStrategyLoading(false)
  }

  const getFeedColor = (type: string) => {
    switch (type) {
      case 'signal':
        return '#ffd700'
      case 'trade':
        return '#00ff88'
      case 'warn':
        return '#ff3b3b'
      case 'learn':
        return '#9945ff'
      default:
        return '#777777'
    }
  }

  const getFeedPrefix = (type: string) => {
    switch (type) {
      case 'signal':
        return '⚡ '
      case 'trade':
        return '✓ '
      case 'warn':
        return '⚠ '
      case 'learn':
        return '◈ '
      default:
        return ''
    }
  }

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

  const strategyColors: Record<string, string> = {
    wallet_tracker: '#2563eb',
    zombie_hunter: '#9945ff',
  }

  const strategyLabels: Record<string, string> = {
    wallet_tracker: 'Wallet Tracker',
    zombie_hunter: 'Zombie Hunter',
  }

  const numericParamLabels: Record<string, string> = {
    min_mcap_to_track: 'Min MCap to Track ($)',
    min_consensus_30min: 'Min Wallets (30min)',
    min_consensus_total: 'Min Wallets (total)',
    exit_pct_1: 'First Exit (%)',
    exit_sell_1: 'First Exit Size (%)',
    exit_pct_2: 'Second Exit (%)',
    exit_sell_2: 'Second Exit Size (%)',
    exit_pct_3: 'Final Exit (%)',
    exit_sell_3: 'Final Exit Size (%)',
    true_zombie_daily_vol: 'True Zombie Vol/Day ($)',
    sleeping_daily_vol: 'Sleeping Vol/Day ($)',
    dormancy_days: 'Dormancy Days',
    min_spike_ratio: 'Min Spike Ratio (x)',
  }

  const strategyTrades = selectedStrategy
    ? trades.filter((trade) => trade.strategy === selectedStrategy)
    : []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#000',
        color: '#f0f0f0',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 44,
          background: '#080808',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#f5c000', fontWeight: 700, fontSize: 14 }}>⬡ SpecterAI</span>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#00ff88',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <span
            style={{
              color: '#00ff88',
              fontSize: 10,
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.15em',
            }}
          >
            AGENT ACTIVE
          </span>
          {stats && (
            <span
              style={{
                color: '#555555',
                fontSize: 10,
                fontFamily: 'DM Mono, monospace',
                marginLeft: 16,
              }}
            >
              CYCLE {stats.cycle_count}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {walletConnected ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'DM Mono, monospace',
                fontSize: 10,
              }}
            >
              <span style={{ color: '#f5c000' }}>{walletAddress}</span>
              <span style={{ color: '#00ff88' }}>10.00 SOL</span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              style={{
                padding: '4px 12px',
                background: 'transparent',
                color: '#f5c000',
                border: '1px solid #f5c00040',
                cursor: 'pointer',
                fontSize: 10,
                borderRadius: 2,
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.1em',
              }}
            >
              CONNECT WALLET
            </button>
          )}
          {stats && (
            <span
              style={{
                color: '#666666',
                fontSize: 10,
                fontFamily: 'DM Mono, monospace',
              }}
            >
              SMART WALLETS: {stats.smart_wallets_tracked}
            </span>
          )}
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={() => setPaperMode(true)}
              style={{
                padding: '3px 10px',
                fontSize: 10,
                fontWeight: 700,
                background: paperMode ? '#f5c000' : 'transparent',
                color: paperMode ? '#000' : '#666666',
                border: '1px solid #1a1a1a',
                cursor: 'pointer',
                borderRadius: '3px 0 0 3px',
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.1em',
              }}
            >
              PAPER
            </button>
            <button
              onClick={() => setPaperMode(false)}
              style={{
                padding: '3px 10px',
                fontSize: 10,
                fontWeight: 700,
                background: !paperMode ? '#ff3b3b' : 'transparent',
                color: !paperMode ? '#fff' : '#666666',
                border: '1px solid #1a1a1a',
                cursor: 'pointer',
                borderRadius: '0 3px 3px 0',
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.1em',
              }}
            >
              REAL
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr 300px',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: '#080808',
            borderRight: '1px solid #1a1a1a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1a1a1a' }}>
            <span
              style={{
                color: '#555555',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.2em',
                fontFamily: 'DM Mono, monospace',
              }}
            >
              STRATEGIES
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {stats &&
              Object.entries(stats.strategies).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    borderBottom: '1px solid #0f0f0f',
                    background: selectedStrategy === key ? '#f5c00008' : 'transparent',
                    borderLeft: selectedStrategy === key ? '2px solid #f5c000' : '2px solid transparent',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: val.active ? strategyColors[key] || '#00ff88' : '#555555',
                        }}
                      />
                      <div
                        onClick={() =>
                          setSelectedStrategy(selectedStrategy === key ? null : key)
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: 12, color: '#f0f0f0', fontWeight: 500 }}>
                          {strategyLabels[key] || key}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: val.trades > 0 ? '#00ff88' : '#555555',
                            fontFamily: 'DM Mono, monospace',
                            marginTop: 1,
                          }}
                        >
                          {val.active ? 'ACTIVE' : 'PAUSED'} · {val.trades} TRADES
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setExpandedStrategy(expandedStrategy === key ? null : key)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#555555',
                          cursor: 'pointer',
                          fontSize: 10,
                          padding: '2px 4px',
                        }}
                      >
                        {expandedStrategy === key ? '▲' : '▼'}
                      </button>
                      <div
                        onClick={() => toggleStrategy(key, !val.active)}
                        style={{
                          width: 28,
                          height: 14,
                          borderRadius: 7,
                          background: val.active ? '#f5c000' : '#1a1a1a',
                          cursor: 'pointer',
                          position: 'relative',
                          border: '1px solid #1a1a1a',
                          transition: 'background 0.2s',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 1,
                            left: val.active ? 13 : 1,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: val.active ? '#000' : '#666666',
                            transition: 'left 0.2s',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {expandedStrategy === key && params[key] && (
                    <div
                      style={{
                        padding: '8px 12px 12px',
                        background: '#050505',
                        borderTop: '1px solid #111',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: '#666666',
                          fontFamily: 'DM Mono, monospace',
                          marginBottom: 8,
                          letterSpacing: '0.1em',
                        }}
                      >
                        {params[key].description}
                      </div>
                      {Object.entries(params[key]).map(([param, val]) => {
                        if (typeof val !== 'number') return null
                        return (
                          <div key={param} style={{ marginBottom: 6 }}>
                            <div
                              style={{
                                fontSize: 9,
                                color: '#666666',
                                marginBottom: 2,
                                letterSpacing: '0.05em',
                              }}
                            >
                              {numericParamLabels[param] || param}
                            </div>
                            <input
                              type="number"
                              value={editedParams[key]?.[param] ?? val}
                              onChange={(e) =>
                                setEditedParams((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...(prev[key] || {}),
                                    [param]: Number(e.target.value),
                                  },
                                }))
                              }
                              style={{
                                width: '100%',
                                background: '#0a0a0a',
                                border: '1px solid #1a1a1a',
                                color: '#f5c000',
                                padding: '3px 6px',
                                fontSize: 11,
                                fontFamily: 'DM Mono, monospace',
                                borderRadius: 2,
                                outline: 'none',
                              }}
                            />
                          </div>
                        )
                      })}
                      <button
                        onClick={() => saveParams(key)}
                        style={{
                          width: '100%',
                          marginTop: 8,
                          padding: '5px 0',
                          fontSize: 10,
                          background: '#f5c00020',
                          color: '#f5c000',
                          border: '1px solid #f5c00040',
                          cursor: 'pointer',
                          borderRadius: 2,
                          fontWeight: 600,
                          letterSpacing: '0.1em',
                        }}
                      >
                        SAVE CHANGES
                      </button>
                    </div>
                  )}
                </div>
              ))}

            {stats?.custom_strategies?.map((cs: any, i: number) => (
              <div key={i} style={{ padding: '10px 12px', borderBottom: '1px solid #0f0f0f' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#9945ff',
                    }}
                  />
                  <div style={{ fontSize: 12, color: '#f0f0f0' }}>{cs.name}</div>
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#555555',
                    marginTop: 2,
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  CUSTOM · AI GENERATED
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid #1a1a1a' }}>
            <button
              onClick={() => setShowStrategyModal(true)}
              style={{
                width: '100%',
                padding: '8px 0',
                background: '#f5c00010',
                color: '#f5c000',
                border: '1px solid #f5c00030',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 3,
                letterSpacing: '0.15em',
                fontFamily: 'DM Mono, monospace',
              }}
            >
              + CREATE STRATEGY
            </button>
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #1a1a1a' }}>
            <div
              style={{
                fontSize: 9,
                color: '#555555',
                letterSpacing: '0.2em',
                fontFamily: 'DM Mono, monospace',
                marginBottom: 8,
              }}
            >
              PAPER BALANCE
            </div>
            <div
              style={{
                fontSize: 24,
                color: '#00ff88',
                fontFamily: 'DM Mono, monospace',
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              {paperBalance.toFixed(2)} SOL
            </div>

            {!showDeposit ? (
              <button
                onClick={() => setShowDeposit(true)}
                style={{
                  width: '100%',
                  padding: '6px 0',
                  background: '#00ff8810',
                  color: '#00ff88',
                  border: '1px solid #00ff8830',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 2,
                  fontFamily: 'DM Mono, monospace',
                  letterSpacing: '0.1em',
                }}
              >
                + DEPOSIT SOL
              </button>
            ) : (
              <div>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Amount in SOL"
                  style={{
                    width: '100%',
                    background: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    color: '#f0f0f0',
                    padding: '5px 8px',
                    fontSize: 11,
                    borderRadius: 2,
                    marginBottom: 6,
                    outline: 'none',
                    fontFamily: 'DM Mono, monospace',
                  }}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => {
                      const amount = parseFloat(depositAmount) || 0
                      if (amount > 0) {
                        setPaperBalance((prev) => prev + amount)
                        setDepositAmount('')
                        setShowDeposit(false)
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '5px 0',
                      background: '#00ff88',
                      color: '#000',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 2,
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    CONFIRM
                  </button>
                  <button
                    onClick={() => setShowDeposit(false)}
                    style={{
                      padding: '5px 8px',
                      background: 'transparent',
                      color: '#444444',
                      border: '1px solid #1a1a1a',
                      cursor: 'pointer',
                      fontSize: 10,
                      borderRadius: 2,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 36,
              borderBottom: '1px solid #1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              flexShrink: 0,
            }}
          >
            {selectedStrategy ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setSelectedStrategy(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#666666',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: 0,
                    }}
                  >
                    ←
                  </button>
                  <span
                    style={{
                      color: '#f5c000',
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {strategyLabels[selectedStrategy] || selectedStrategy}
                  </span>
                </div>
                <span
                  style={{
                    color: '#00ff88',
                    fontSize: 10,
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  {strategyTrades.length} TRADES
                </span>
              </>
            ) : (
              <>
                <span
                  style={{
                    color: '#555555',
                    fontSize: 10,
                    letterSpacing: '0.2em',
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  LIVE ACTIVITY
                </span>
                <span
                  style={{
                    color: '#00ff88',
                    fontSize: 10,
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  {feed.length} LIVE
                </span>
              </>
            )}
          </div>

          {selectedStrategy ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 100px 100px 80px 80px 70px 1fr',
                  padding: '8px 16px',
                  borderBottom: '1px solid #1a1a1a',
                  color: '#555555',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                <span>TOKEN</span>
                <span>ENTRY</span>
                <span>CURRENT</span>
                <span>PnL</span>
                <span>CONFIDENCE</span>
                <span>STATUS</span>
                <span>REASONING</span>
              </div>

              {strategyTrades.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 240,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#555555',
                    fontSize: 14,
                  }}
                >
                  No trades yet. Agent is scanning...
                </div>
              ) : (
                strategyTrades.map((trade) => (
                  <div
                    key={trade.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 100px 100px 80px 80px 70px 1fr',
                      padding: '8px 16px',
                      borderBottom: '1px solid #0f0f0f',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: '#f5c000', fontWeight: 700, fontSize: 12 }}>
                      {trade.symbol}
                    </span>
                    <span style={{ color: '#f0f0f0', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>
                      {(trade.entry_price || 0).toFixed(6)}
                    </span>
                    <span style={{ color: '#f0f0f0', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>
                      {(trade.current_price || 0).toFixed(6)}
                    </span>
                    <span
                      style={{
                        color: (trade.pnl_pct || 0) >= 0 ? '#00ff88' : '#ff3b3b',
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'DM Mono, monospace',
                      }}
                    >
                      {(trade.pnl_pct || 0) >= 0 ? '+' : ''}
                      {(trade.pnl_pct || 0).toFixed(2)}%
                    </span>
                    <span style={{ color: '#666666', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>
                      {trade.confidence}%
                    </span>
                    <span>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: 3,
                          background: trade.status === 'open' ? '#f5c00018' : '#1a1a1a',
                          color: trade.status === 'open' ? '#f5c000' : '#666666',
                          fontSize: 9,
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        {trade.status === 'open' ? 'OPEN' : 'CLOSED'}
                      </span>
                    </span>
                    <span
                      style={{
                        color: '#555555',
                        fontSize: 10,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={trade.size}
                    >
                      {trade.size?.slice(0, 60) || 'No reasoning available'}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              {feed.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '5px 16px',
                    borderBottom: '1px solid #080808',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      color: '#555555',
                      fontSize: 10,
                      flexShrink: 0,
                      fontFamily: 'DM Mono, monospace',
                      paddingTop: 1,
                    }}
                  >
                    {formatTime(entry.timestamp)}
                  </span>
                  <span
                    style={{
                      color: getFeedColor(entry.type),
                      fontSize: 11,
                      lineHeight: '1.5',
                      fontFamily: entry.type !== 'info' ? 'Inter, sans-serif' : 'DM Mono, monospace',
                    }}
                  >
                    {getFeedPrefix(entry.type)}
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            background: '#080808',
            borderLeft: '1px solid #1a1a1a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
            <div
              style={{
                fontSize: 10,
                color: '#555555',
                letterSpacing: '0.2em',
                fontFamily: 'DM Mono, monospace',
                marginBottom: 10,
              }}
            >
              PERFORMANCE
            </div>

            {stats ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {[
                    ['TOTAL TRADES', stats.total_trades],
                    ['WIN RATE', `${stats.win_rate}%`],
                    ['OPEN', stats.open_trades],
                    ['CLOSED', stats.closed_trades],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <div
                        style={{
                          fontSize: 9,
                          color: '#555555',
                          letterSpacing: '0.1em',
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          color: '#f0f0f0',
                          fontWeight: 700,
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        {val}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: '#555555',
                      letterSpacing: '0.1em',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    PAPER BALANCE
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      color: '#00ff88',
                      fontWeight: 700,
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {paperBalance.toFixed(2)} SOL
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: '#555555',
                    letterSpacing: '0.2em',
                    fontFamily: 'DM Mono, monospace',
                    marginBottom: 6,
                  }}
                >
                  RECENT TRADES
                </div>

                {trades.length === 0 ? (
                  <div
                    style={{
                      fontSize: 10,
                      color: '#444444',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    NO TRADES YET
                  </div>
                ) : (
                  trades.slice(0, 5).map((trade) => (
                    <div
                      key={trade.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        borderBottom: '1px solid #0f0f0f',
                      }}
                    >
                      <div>
                        <span style={{ color: '#f5c000', fontSize: 11, fontWeight: 600 }}>
                          {trade.symbol}
                        </span>
                        <span
                          style={{
                            color: '#555555',
                            fontSize: 9,
                            marginLeft: 6,
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          {trade.strategy?.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontFamily: 'DM Mono, monospace',
                            color: (trade.pnl_pct || 0) >= 0 ? '#00ff88' : '#ff3b3b',
                          }}
                        >
                          {(trade.pnl_pct || 0) >= 0 ? '+' : ''}
                          {trade.pnl_pct?.toFixed(1) || '0.0'}%
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#555555',
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          {trade.confidence}% conf
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              <div
                style={{
                  color: '#ff3b3b',
                  fontSize: 10,
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                STATS UNAVAILABLE
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: '#555555',
                letterSpacing: '0.2em',
                fontFamily: 'DM Mono, monospace',
                marginBottom: 8,
              }}
            >
              TALK TO SPECTER
            </div>

            <div
              ref={chatRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {chat.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '6px 8px',
                      background: msg.role === 'user' ? '#1a1a1a' : '#0a0a0a',
                      border: '1px solid #1a1a1a',
                      borderRadius: 3,
                      fontSize: 11,
                      lineHeight: '1.5',
                    }}
                  >
                    {msg.role === 'specter' && (
                      <span
                        style={{
                          color: '#f5c000',
                          fontSize: 10,
                          fontFamily: 'DM Mono, monospace',
                          display: 'block',
                          marginBottom: 2,
                        }}
                      >
                        ⬡ SPECTER:
                      </span>
                    )}
                    <span style={{ color: '#d0d0d0' }}>{msg.text}</span>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ color: '#555555', fontSize: 11 }}>⬡ Specter is thinking...</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Ask Specter about a signal..."
                style={{
                  flex: 1,
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  color: '#f0f0f0',
                  padding: '6px 8px',
                  fontSize: 11,
                  borderRadius: 2,
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              <button
                onClick={() => sendChat()}
                style={{
                  padding: '6px 12px',
                  background: '#f5c000',
                  color: '#000',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 2,
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      </div>

      {showStrategyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: 4,
              padding: 24,
              width: 480,
              maxWidth: '90vw',
            }}
          >
            <div style={{ color: '#f5c000', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
              Create New Strategy
            </div>
            <div
              style={{
                color: '#666666',
                fontSize: 10,
                fontFamily: 'DM Mono, monospace',
                marginBottom: 16,
              }}
            >
              Describe your strategy in plain English. Specter will understand and implement it.
            </div>
            <textarea
              value={strategyDesc}
              onChange={(e) => setStrategyDesc(e.target.value)}
              placeholder="e.g. Alert me when any token under $500k mcap has more than 20 smart traders buying in the last hour..."
              style={{
                width: '100%',
                height: 100,
                background: '#050505',
                border: '1px solid #1a1a1a',
                color: '#f0f0f0',
                padding: '8px 10px',
                fontSize: 11,
                borderRadius: 2,
                outline: 'none',
                resize: 'none',
                marginBottom: 12,
                fontFamily: 'Inter, sans-serif',
              }}
            />
            {strategyResponse && (
              <div
                style={{
                  background: '#050505',
                  border: '1px solid #1a1a1a',
                  borderRadius: 2,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    color: '#f5c000',
                    fontSize: 9,
                    fontFamily: 'DM Mono, monospace',
                    marginBottom: 4,
                  }}
                >
                  ⬡ SPECTER RESPONSE:
                </div>
                <div style={{ color: '#d0d0d0', fontSize: 11 }}>{strategyResponse}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={createStrategy}
                disabled={strategyLoading}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: '#f5c000',
                  color: '#000',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 2,
                }}
              >
                {strategyLoading ? 'CREATING...' : 'CREATE STRATEGY'}
              </button>
              <button
                onClick={() => {
                  setShowStrategyModal(false)
                  setStrategyResponse('')
                  setStrategyDesc('')
                }}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#666666',
                  border: '1px solid #1a1a1a',
                  cursor: 'pointer',
                  fontSize: 11,
                  borderRadius: 2,
                }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  )
}
