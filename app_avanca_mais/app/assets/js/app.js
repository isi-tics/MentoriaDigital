var app = new Vue({
  el: '#app',
  data: {//variáveis para ajudar nos cálculos e exibição de resultados nas telas da aplicação 
    scanner: null,
    activeCameraId: null,
    cameras: [],
    scans: [],
    premotivos: [],
    dictCMPPre: {},
    totalCS: 0,
    totalQP: 0,
    totalQPFinal: 0,
    totalQPFinalView: 0,
    totalMQ: 0,
    totalCN: 50,
    totalDR: 0,
    totalTPP: 0,
    totalTNP: 0,
    dictCMP: {},
    totalCMP: 0,
    availability: 0,
    performance: 0,
    quality: 0,
    totalTimeStopped: 0,
    extraHours: 0,
    totalCards: null,
    oee: ""
  },
  mounted: function () {
    var self = this;
    self.totalCards = 0;
    self.oee = "";

    if (window.location.href.indexOf("camera.html") > -1) {
      self.scanner = new Instascan.Scanner({ video: document.getElementById('preview'), scanPeriod: 5, mirror: false });
      self.scanner.addListener('scan', function (content, image) {
        //tratando os dados como string e substituindo dados vazios por 0 para os cálculos funcionarem corretamente
        var splitContent = content.split(',');
        content = "";
        for (var i = 0; i < splitContent.length; i++) {
          var current = splitContent[i];
          const value = current.substring(current.indexOf(':') + 1, current.length);
          if (value.replace(/\s+/g, '') == '') {
            current += '0';
          }
          content += current;
          if (i != splitContent.length - 1) {
            content += ",";
          }
        }
        var filtered = self.scans.filter(function (val, index) {
          return JSON.parse(val.content).ID == JSON.parse(content).ID;
        });//filtro no array de scans para saber se qrcode já foi lido, e caso tenha, não adicionar no array
        if (filtered.length == 0) {
          const jsonCurrentCard = JSON.parse(content);
          const booleanBenefitCard = ((self.dictCMPPre[self.translateCMP(jsonCurrentCard.CMP)] != undefined || jsonCurrentCard.CMP == 0) && jsonCurrentCard.ID.toString().startsWith('3', 0));
          //identificando se é uma carta de benefício, e se for, ou não é relacionada a motivo de parada ou é, mas que tenha sido registrada em alguma carta de deu ruim
          if (booleanBenefitCard || !jsonCurrentCard.ID.toString().startsWith('3', 0)) {
            self.scans.push({ date: +(Date.now()), content: content, scanned: false });
            self.totalCards++;
            $('#background-camera').addClass('backgroundCamera');
          }

          setTimeout(
            function () {
              $('#background-camera').removeClass('backgroundCamera');
            }, 1500);
        }
        self.scans.forEach(el => {
          var obj = JSON.parse(el.content);
          if (el.scanned == false) {//flag para evitar que os valores de uma carta sejam calculados novamente
            self.totalMQ = self.totalMQ + obj.MQ;
            self.totalQP = self.totalQP + obj.QP;
            self.totalQPFinal = self.totalQP - self.totalMQ;
            if (self.totalQPFinal < 0) {
              self.totalQPFinal = 0;
            }
            else {
              self.totalQPFinalView = self.totalQPFinal;
              self.totalQPFinal = self.totalQPFinal;
            }
            self.totalCS = self.totalCS + obj.CS;
            self.totalTPP = self.totalTPP + obj.TPP;
            self.totalTNP = self.totalTNP + obj.TNP;
            self.totalDR = self.totalDR + obj.DR;

            if (obj.CMP != 0) {
              var label = self.translateCMP(obj.CMP);

              self.totalTimeStopped += obj.TNP;
              var timeStopped = 0;
              var occurences = 0;
              if (self.dictCMPPre[label] == undefined) {
                if (obj.ID.toString().startsWith('2', 0)) {
                  occurences = 1;
                  timeStopped = obj.TNP;
                }
              } else {
                timeStopped = self.dictCMPPre[label].timeStopped + obj.TNP;
                occurences = self.dictCMPPre[label].occurences + 1;
              }

              if (occurences > 0) self.dictCMPPre[label] = { occurences: occurences, timeStopped: timeStopped < 0 ? 0 : timeStopped };
            }

            //contabilizando horas extras, caso existam
            if (obj.ID.toString().startsWith("4", 0)) {
              self.extraHours += obj.DR;
            }

            self.availability = (((self.totalDR - self.totalTPP) - self.totalTNP) / (self.totalDR - self.totalTPP)).toFixed(2);
            self.quality = (self.totalQP - self.totalMQ) / self.totalQP;
            self.totalCN = 50;
            self.performance = (self.totalQP / (self.totalCN * ((self.totalDR - self.totalTPP) - self.totalTNP) / 30));
            self.oee = (self.availability * self.quality * self.performance * 100);
            if (isNaN(self.oee)) self.oee = 0 + "%";
            if (self.oee != Math.round(self.oee)) self.oee = self.oee.toFixed(2) + "%";
            if (isNaN(self.quality) || self.quality == Number.POSITIVE_INFINITY) self.quality = 0;
            if (isNaN(self.availability) || self.availability == Number.POSITIVE_INFINITY) self.availability = 0;
            if (self.performance == Number.POSITIVE_INFINITY || isNaN(self.performance)) self.performance = 0;

            //gerar gráficos
            self.generateCharts(parseFloat(self.availability), self.quality, self.performance);

            el.scanned = true;
          }
        });
      });

      Instascan.Camera.getCameras().then(function (cameras) {//biblioteca que identifica as câmeras disponíveis para ler os qr codes
        self.cameras = cameras;
        if (cameras.length > 0) {
          self.activeCameraId = cameras[0].id;
          self.scanner.start(cameras[0]);
        } else {
          console.error('No cameras found.');
        }
      }).catch(function (e) {
        console.error(e);
      });
    }
  },
  methods: {
    formatName: function (name) {
      return name || '(unknown)';
    },
    selectCamera: function (camera) {
      this.activeCameraId = camera.id;
      this.scanner.start(camera);
    },
    addData: function (chart, datum) {
      chart.data.datasets.forEach((dataset) => {
        dataset.data = datum;
      });
      chart.update();
    },
    addDatasets: function (chart, datasets) {
      chart.data.datasets = datasets;
      chart.update();
    },
    removeData: function (chart) {
      chart.data.datasets.forEach((dataset) => {
        dataset.data = [];
      });
      chart.update();
    },
    generateCharts: function (availability, quality, performance) {
      //método para gerar os gráficos a cada vez que uma carta é lida
      var dict = this.auxSortReasonCodeByTime(this.dictCMPPre); //ordenação do dicionário para renderizar gráfico de pareto da forma correta
      availability = availability != Math.round(availability) ? availability.toFixed(2) : availability;
      quality = quality != Math.round(quality) ? quality.toFixed(2) : quality;
      performance = performance != Math.round(performance) ? performance.toFixed(2) : performance;
      var labels = Object.keys(dict);
      var datasetPercentAccumulated = [];
      var datasetBar = [];
      var percentAccumulated = 0;
      for (key in dict) {
        if (dict.hasOwnProperty(key)) {
          var accumulated = (dict[key].timeStopped / this.totalTimeStopped) * 100;
          percentAccumulated = percentAccumulated == 0 ? accumulated : accumulated + percentAccumulated;
          if (percentAccumulated != Math.round(percentAccumulated)) percentAccumulated = parseFloat(percentAccumulated).toFixed(2);
          datasetPercentAccumulated.push(percentAccumulated);
          datasetBar.push(dict[key].timeStopped);
        }
      }
      var ctx = document.getElementById("myChart");

      if (ctx != undefined && ctx != null && labels.length > 0) {
        ctx = ctx.getContext('2d');
        var myChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Tempo de parada',
              data: datasetBar,
              yAxisID: 'duration',
              backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)'
              ],
              borderColor: [
                'rgba(255,99,102,1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
              ],
              borderWidth: 1,
              datalabels: {
                formatter: function (value, context) {
                  const ret = value > -1 ? value : 0;
                  return ret + "min";
                }
              }
            }, {
              type: 'line',
              label: '% acumulada',
              yAxisID: 'accumulated',
              data: datasetPercentAccumulated,
              borderColor: [
                'rgba(143, 7, 62,1)'
              ],
              fill: false,
              datalabels: {
                anchor: 'start',
                align: 'top',
                formatter: function (value, context) {
                  const ret = parseInt(value) > -1 ? value : 0;
                  return ret + "%";
                }
              }
            }]
          },
          options: {
            title: {
              display: true,
              text: 'Pareto das Paradas',
              fontSize: 18
            },
            responsive: true,
            tooltips: {
              enabled: false
            },
            maintainAspectRatio: false,
            scales: {
              yAxes: [{
                id: 'duration',
                position: 'left',
                type: 'linear',
                ticks: {
                  beginAtZero: true,
                  min: 0
                },
                gridLines: {
                  display: false
                }
              }, {
                id: 'accumulated',
                ticks: {
                  beginAtZero: true,
                  min: 0,
                  max: 125,
                  stepSize: 25,
                  callback: function (label, index, labels) {
                    var l = label != 125 ? label + '%' : "";
                    return l;
                  }
                },
                type: 'linear',
                position: 'right'
              }],
              xAxes: [{
                ticks: {
                  beginAtZero: true,
                  min: 0,
                  suggestedMin: 0,
                  maxRotation: 90,
                  minRotation: 75,
                  fontSize: 12
                }
              }]
            }
          }
        });
        this.removeData(myChart);
        this.addDatasets(myChart, [{
          label: 'Tempo de parada',
          data: datasetBar,
          yAxisID: 'duration',
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
          ],
          borderColor: [
            'rgba(255,99,102,1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1,
          datalabels: {
            formatter: function (value, context) {
              const ret = value > -1 ? value : 0;
              return ret + "min";
            }
          }
        }, {
          type: 'line',
          label: '% acumulada',
          yAxisID: 'accumulated',
          data: datasetPercentAccumulated,
          borderColor: [
            'rgba(143, 7, 62,1)'
          ],
          fill: false,
          datalabels: {
            anchor: 'start',
            align: 'top',
            formatter: function (value, context) {
              const ret = parseInt(value) > -1 ? value : 0;
              return ret + "%";
            }
          }
        }]);
      }

      var ctxP = document.getElementById("pieChart");
      if (ctxP != undefined && ctxP != null) {
        ctxP = ctxP.getContext('2d');
        var myPieChart = new Chart(ctxP, {
          type: 'pie',
          data: {
            labels: ["Peças boas", "Peças ruins"],
            datasets: [{
              data: [100 * quality, 100 - (100 * quality)],
              backgroundColor: ["#F7464A", "#FA9B9E", "#FDB45C", "#949FB1", "#4D5360"],
              hoverBackgroundColor: ["#FF5A5E", "#ffcdcf", "#FFC870", "#A8B3C5", "#616774"],
              borderColor: ['#bd0022', '#bd0022'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            title: {
              display: true,
              text: 'Qualidade',
              fontSize: 18
            },
            tooltips: {
              callbacks: {
                label: function (tooltipItem, data) {
                  var label = data.labels[tooltipItem.index] || '';
                  if (label) {
                    label += ': ';
                  }
                  label += Math.round(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]) + '%';
                  return label;
                }
              }
            },
            plugins: {
              datalabels: {
                color: "#000",
                formatter: function (value, context) {
                  return Math.round(value) + "%";
                },
                align: 'bottom',
                anchor: 'bottom'
              }
            }
          }
        });
        this.removeData(myPieChart);
        this.addData(myPieChart, [100 * quality, 100 - (100 * quality)]);
      }

      var ctxPieAvblt = document.getElementById("pieChartAvailability");
      if (ctxPieAvblt != undefined && ctxPieAvblt != null) {
        ctxPieAvblt = ctxPieAvblt.getContext('2d');
        var myPieChartAvailability = new Chart(ctxPieAvblt, {
          type: 'pie',
          data: {
            labels: ["Disponível", "Indisponível"],
            datasets: [{
              data: [100 * availability, 100 - (100 * availability)],
              backgroundColor: ["#949FB1", "#4D5360"],
              hoverBackgroundColor: ["#A8B3C5", "#616774"]
            }]
          },
          options: {
            responsive: true,
            title: {
              display: true,
              text: 'Disponibilidade',
              fontSize: 18
            },
            tooltips: {
              callbacks: {
                label: function (tooltipItem, data) {
                  var label = data.labels[tooltipItem.index] || '';

                  if (label) {
                    label += ': ';
                  }
                  label += Math.round(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]) + '%';
                  return label;
                }
              }
            },
            plugins: {
              datalabels: {
                color: "#fff",
                formatter: function (value, context) {
                  return Math.round(value) + "%";
                }
              }
            }
          }
        });
        this.removeData(myPieChartAvailability);
        this.addData(myPieChartAvailability, [100 * availability, 100 - (100 * availability)]);
      }
      var ctxPiePerform = document.getElementById("pieChartPerformance");
      if (ctxPiePerform != null && ctxPiePerform != undefined) {
        ctxPiePerform = ctxPiePerform.getContext('2d');
        var myPieChartPerformance = new Chart(ctxPiePerform, {
          type: 'pie',
          data: {
            labels: ["Produção real", ""],
            datasets: [{
              data: [(100 * performance), 100 - (100 * performance)],
              backgroundColor: ["#949FB1", "rgb(209,210,212)"],
              hoverBackgroundColor: ["#c5d0e3", "rgb(209,210,212)"],
              borderColor: ["#c5d0e3", "rgba(209,210,212,0)"]
            }]
          },
          options: {
            responsive: true,
            tooltips: {
              enabled: false
            },
            title: {
              display: true,
              text: 'Performance',
              fontSize: 18
            },
            legend: {
              onClick: function (e) {
                e.stopPropagation();
              }
            },
            plugins: {
              datalabels: {
                anchor: 'center',
                offset: 6,
                align: 'top',
                formatter: function (value, context) {
                  const ret = context.dataIndex == 1 ? '' : Math.round(value) + "%";
                  return ret;
                }
              }
            }
          }
        });
        this.removeData(myPieChartPerformance);
        this.addData(myPieChartPerformance, [100 * performance, 100 - (100 * performance)]);
      }
    },
    setRound: function (round) {//a depender de uma rodada já ter sido concluída anteriormente, pode ser que o usuário seja redirecionado para a página de resultados dessa rodada, senão vai para a tela de câmera dessa rodada
      //método atribuído aos botões de rodada da página inicial
      const currentRound = localStorage.getItem('currentRound');
      var roundDone = localStorage.getItem('round' + round + 'Done');
      if ((currentRound != undefined && roundDone != undefined) && (currentRound != undefined && currentRound != round)) {
        localStorage.setItem('pastRound', round);
      }
      else {
        localStorage.removeItem('pastRound');
        localStorage.setItem('currentRound', round);
      }
      if (roundDone != undefined && (roundDone != null && roundDone != undefined)) {
        window.location.href = "graph.html";
      } else {
        window.location.href = "camera.html";
      }
    },
    getRound: function () {
      return localStorage.getItem('currentRound');//utilizado na exibição correta da rodada na tela da câmera
    },
    translateCMP(cmp) {//tradução do código de motivo para seu significado, colocado como método para melhorar legibilidade do código
      var label = "";
      switch (cmp) {
        case 1:
          label = "Manutenção";
          break;
        case 2:
          label = "Falta de Pessoas";
          break;
        case 3:
          label = "Setup";
          break;
        case 4:
          label = "Falha Operacional";
          break;
        default: label = "Outro";
      }
      return label;
    },
    concludeRound: function () {
      const thisRound = localStorage.getItem('currentRound');
      for (key in this.dictCMPPre) {
        if (this.dictCMPPre.hasOwnProperty(key)) {
          if (this.dictCMPPre[key].timeStopped == 0) {
            delete this.dictCMPPre[key];
          }
        }
      }

      // //valores finais em porcentagem para tela de gráficos
      localStorage.setItem('availabilityRound' + thisRound, this.availability);
      localStorage.setItem('qualityRound' + thisRound, this.quality);
      localStorage.setItem('performanceRound' + thisRound, this.performance);
      localStorage.setItem('costsPerItemRound' + thisRound, (this.totalCS / (this.totalQP - this.totalMQ)).toFixed(2));
      localStorage.setItem('oeeRound' + thisRound, this.oee);
      localStorage.setItem('reasonCodesRound' + thisRound, JSON.stringify(this.auxSortReasonCodeByTime(this.dictCMPPre)));
      localStorage.setItem('round' + thisRound + 'Done', true);
      localStorage.setItem('producedQtyRound' + thisRound, this.totalQP - this.totalMQ);
      localStorage.setItem('producedQtyRoundTotal' + thisRound, this.totalQP);
      localStorage.setItem('totalCostRound' + thisRound, this.totalCS);
      const durationHour = ((this.totalDR - this.totalTPP) - this.totalTNP) / 60;
      localStorage.setItem('durationRound' + thisRound, durationHour != Math.round(durationHour) ? durationHour.toFixed(2) : durationHour);
      if (this.extraHours > 0) localStorage.setItem('extraHoursRound' + thisRound, (this.extraHours / 60).toFixed(1));

      localStorage.removeItem('pastRound');
      window.location.href = "graph.html"
    },
    auxSortReasonCodeByTime: function (reasonCodes) {
      //método para reorganizar em ordem decrescente por tempo total de parada o dicionário (chave:valores) dos motivos de parada
      var sortable = [];//uso de array para que seja utilizado o método .sort específico do tipo Array
      for (var key in reasonCodes) {
        if (reasonCodes.hasOwnProperty(key)) sortable.push([key, reasonCodes[key].timeStopped, reasonCodes[key].occurences]);
      }
      // método para a ordem ocorrer de forma decrescente
      sortable.sort(function (a, b) {
        return b[1] - a[1]; // compare numbers
      });
      console.log('sort dict', sortable);
      reasonCodes = {}; //esvaziando o dicionário para que seja refeito na ordem correta
      for (var i = 0; i < sortable.length; i++) {
        reasonCodes[sortable[i][0]] = { occurences: sortable[i][2], timeStopped: sortable[i][1] };
      }
      return reasonCodes;
    },
    generateMailBody: function () {
      //método auxiliar para formar o corpo do e-mail segundo a codificação UTF8 para caracteres especiais para o browser, enviando todos os resultados calculados para a rodada atual
      const round = localStorage.getItem('pastRound') != undefined ? localStorage.getItem('pastRound') : localStorage.getItem('currentRound');
      var body = "OEE: " + localStorage.getItem('oeeRound' + round) + "% %0D%0A" + "Performance: " + (100 * parseFloat(localStorage.getItem('performanceRound' + round))).toFixed(2) + "% %0D%0A"
        + "Qualidade: " + (100 * parseFloat(localStorage.getItem('qualityRound' + round))).toFixed(2) + "% %0D%0A" + "Disponibilidade: " + (100 * parseFloat(localStorage.getItem('availabilityRound' + round))).toFixed(2) + "% %0D%0A" +
        "Custo por peça: " + localStorage.getItem('costsPerItemRound' + round) + "%0D%0A Quantidade produzida: " + localStorage.getItem('producedQtyRound' + round) + "%0D%0A Custo total (SENAI Coin): " + localStorage.getItem('totalCostRound' + round) + "%0D%0A"
      "Tempo de produção: " + localStorage.getItem('durationRound' + round) + "%0D%0A";
      var reasonsCode = JSON.parse(localStorage.getItem('reasonCodesRound' + round));
      if (reasonsCode != undefined && Object.keys(reasonsCode).length > 0) {
        body += "Motivo de parada | Tempo Parado em minutos | Incidências: %0D%0A";
        for (var key in reasonsCode) {
          if (reasonsCode.hasOwnProperty(key)) {
            body += "%20%20%20%20" + key + " | " + reasonsCode[key].timeStopped + " | " + reasonsCode[key].occurences + "%0D%0A";
          }
        }
      }
      //cálculo de horas extras caso o jogador tenha pego cartas de Hora Extra
      var extraHours = localStorage.getItem('extraHoursRound' + round);
      if (extraHours != undefined) body += "Horas extras: " + extraHours + "h";
      window.location.href = `mailto:admin@example.org?subject=Avança%20%2B&body=Resultado%20Avança%20%2B%20%2D%20Rodada ${round} %0D%0A${body}`;
    },
    calculateAccumulate: function (timeStopped) {
      //cálculo da porcentagem acummulada das paradas para tabela na tela de câmera
      const accumulated = this.totalTimeStopped > 0 ? parseFloat(100 * (timeStopped / this.totalTimeStopped)) : 0;
      return accumulated == Math.round(accumulated) ? accumulated + "%" : accumulated.toFixed(2) + "%";
    }
  },
  computed: {
    isDisabled: function () {
      return this.totalCards == 0 && this.totalCards != null;
    }
  }
});
