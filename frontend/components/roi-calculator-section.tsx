"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { TrendingUp, DollarSign, Clock } from "lucide-react"

interface CalculatorInputs {
  monthlyFinancialClosures: number
  teamSizeHours: number
  averageHourlyRate: number
  businessType: string
}

export function ROICalculatorSection() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    monthlyFinancialClosures: 4,
    teamSizeHours: 160,
    averageHourlyRate: 125,
    businessType: "sme",
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.1 },
    )

    const section = document.getElementById("roi-calculator")
    if (section) {
      observer.observe(section)
    }

    return () => observer.disconnect()
  }, [])

  const getBusinessDefaults = () => {
    const businessDefaults = {
      sme: { timeReduction: 60, closureTime: 40, accuracy: 98 },
      consulting: { timeReduction: 65, closureTime: 45, accuracy: 99 },
      accounting: { timeReduction: 70, closureTime: 50, accuracy: 99.5 },
      corporate: { timeReduction: 75, closureTime: 60, accuracy: 99.5 },
      default: { timeReduction: 60, closureTime: 40, accuracy: 98 },
    }

    return businessDefaults[inputs.businessType as keyof typeof businessDefaults] || businessDefaults.default
  }

  const businessConfig = getBusinessDefaults()

  const currentMonthlyHours = inputs.teamSizeHours
  const currentAnnualCost = currentMonthlyHours * inputs.averageHourlyRate * 12
  const timeSavedMonthly = (currentMonthlyHours * businessConfig.timeReduction) / 100
  const timeSavedAnnually = timeSavedMonthly * 12
  const costSavingsAnnually = timeSavedAnnually * inputs.averageHourlyRate

  return (
    <section id="roi-calculator" className="py-16 md:py-20 px-4 relative">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-white/80">ROI Calculator</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6 text-balance">
            See your financial{" "}
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">time savings</span>
          </h2>

          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto text-balance">
            Calculate how much time and money FinanceCore saves your organization on financial reporting and analysis
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          {/* Calculator Inputs */}
          <div
            className={`transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <Card className="p-6 md:p-8 bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/15%),theme(backgroundColor.white/5%))] border-white/20 backdrop-blur-sm shadow-2xl h-full flex flex-col">
              <h3 className="text-xl md:text-2xl font-semibold text-white mb-6 md:mb-8">Your Organization</h3>

              <div className="space-y-8 flex-1">
                {/* Business Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Organization Type</label>
                  <Select
                    value={inputs.businessType}
                    onValueChange={(value) => setInputs((prev) => ({ ...prev, businessType: value }))}
                  >
                    <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="sme">SME</SelectItem>
                      <SelectItem value="consulting">Consulting Firm</SelectItem>
                      <SelectItem value="accounting">Accounting Firm</SelectItem>
                      <SelectItem value="corporate">Corporate / Multi-Entity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Monthly Closures */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Monthly Financial Closures:{" "}
                    <span className="text-white font-semibold">{inputs.monthlyFinancialClosures}</span>
                  </label>
                  <Slider
                    value={[inputs.monthlyFinancialClosures]}
                    onValueChange={([value]) => setInputs((prev) => ({ ...prev, monthlyFinancialClosures: value }))}
                    max={12}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span>
                    <span>12</span>
                  </div>
                </div>

                {/* Team Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Monthly Team Hours on Reporting:{" "}
                    <span className="text-white font-semibold">{inputs.teamSizeHours} hours</span>
                  </label>
                  <Slider
                    value={[inputs.teamSizeHours]}
                    onValueChange={([value]) => setInputs((prev) => ({ ...prev, teamSizeHours: value }))}
                    max={800}
                    min={20}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>20h</span>
                    <span>800h</span>
                  </div>
                </div>

                {/* Average Hourly Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Average Hourly Rate:{" "}
                    <span className="text-white font-semibold">€{inputs.averageHourlyRate.toLocaleString()}</span>
                  </label>
                  <Slider
                    value={[inputs.averageHourlyRate]}
                    onValueChange={([value]) => setInputs((prev) => ({ ...prev, averageHourlyRate: value }))}
                    max={300}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>€50</span>
                    <span>€300</span>
                  </div>
                </div>

                <div className="flex-1"></div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Key Benefits</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-white">{businessConfig.timeReduction}% time reduction</span>{" "}
                          on financial reporting
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-white">{businessConfig.closureTime} minute</span> financial
                          close
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-white">{businessConfig.accuracy}% accuracy</span> with
                          automated verification
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Results */}
          <div
            className={`transition-all duration-700 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <Card className="p-6 md:p-8 bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/15%),theme(backgroundColor.white/5%))] border-white/20 backdrop-blur-sm shadow-2xl h-full flex flex-col">
              <h3 className="text-xl md:text-2xl font-semibold text-white mb-6 md:mb-8">
                Your Potential with FinanceCore
              </h3>

              <div className="space-y-6 flex-1">
                {/* Current vs New Metrics */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="text-center p-3 md:p-4 rounded-lg bg-gray-700/30">
                    <div className="text-xs md:text-sm text-gray-400 mb-1">Current Monthly</div>
                    <div className="text-xl md:text-2xl font-bold text-white">{currentMonthlyHours}h</div>
                    <div className="text-xs text-gray-400">on reporting</div>
                  </div>
                  <div className="text-center p-3 md:p-4 rounded-lg bg-white/10 border border-white/20">
                    <div className="text-xs md:text-sm text-gray-300 mb-1">Time Saved</div>
                    <div className="text-xl md:text-2xl font-bold text-white">{Math.round(timeSavedMonthly)}h</div>
                    <div className="text-xs text-gray-300">per month</div>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
                      <span className="text-sm md:text-base text-white">Annual Hours Saved</span>
                    </div>
                    <span className="text-lg md:text-xl font-bold text-white">{Math.round(timeSavedAnnually)}h</span>
                  </div>

                  <div className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
                      <span className="text-sm md:text-base text-white">Annual Cost Savings</span>
                    </div>
                    <span className="text-lg md:text-xl font-bold text-white">
                      €{costSavingsAnnually.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
                      <span className="text-sm md:text-base text-white">ROI Payback Period</span>
                    </div>
                    <span className="text-lg md:text-xl font-bold text-white">
                      {(500 / (costSavingsAnnually / 12)).toFixed(1)}
                      <span className="text-xs ml-1">months</span>
                    </span>
                  </div>
                </div>

                {/* Annual Projection */}
                <div className="mt-6 md:mt-8 p-4 md:p-6 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-center">
                    <div className="text-xs md:text-sm text-gray-300 mb-2">Your Annual Savings with FinanceCore</div>
                    <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
                      €{costSavingsAnnually.toLocaleString()}
                    </div>
                    <div className="text-xs md:text-sm text-gray-400">
                      Plus improved accuracy and real-time financial insights
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
