describe('geo functions', function(){

  it("is defined", function(){
    geofn.should.be.an.Object
  })

  describe('bounds', function(){

    it("is defined", function(){
      geofn.bounds.should.be.a.Function
    })

    it('finds the min/max of a single value', function(){
      geofn
        .bounds([[-1],[1],[2],[4],[3]])
        .should.eql([-1,4])
    })

    it('works for 2 dimensions', function(){
      geofn
        .bounds([[-1,100],[2,95],[1,150]])
        .should.eql([-1,2,95,150])
    })

    it('works for 3 dimensions', function(){
      geofn
        .bounds([[-1,100, 10],[2,95,20],[1,150,15]])
        .should.eql([-1,2,95,150,10,20])
    })

    it('works with weird data', function(){
      geofn
        .bounds([[-1],[2,95,20],[1,150]])
        .should.eql([-1,2,95,150,20,20])
    })

    it('deals with zeros', function(){
      geofn
        .bounds([[0],[3]])
        .should.eql([0,3])
    })

  })

  describe('intersect', function(){

    it("is defined", function(){
      geofn.intersects.should.be.a.Function
    })

    it('works for overlapping boxes', function(){
      geofn
        .intersects([0,1,0,1],[0,1,0,1])
        .should.be.true
    })

    it('works for non-connected boxes', function(){
      geofn
        .intersects([0,1,0,1],[10,11,10,11])
        .should.be.false
    })


    it('works for other cases', function(){

      // inside
      geofn
        .intersects([-1000,1000,-1000,1000],[-1,1,-1,1])
        .should.be.true

      // horizontal separate
      geofn
        .intersects([-10,-9,-1,1],[9,10,-1,1])
        .should.be.false

    })

    it('works in 3 dimensions', function(){

      geofn
        .intersects([-1,1,20,30,-10,10],[-1,1,24,26,-100,100])
        .should.be.true

      geofn
        .intersects([-1,1,20,30,10,11],[-1,1,24,26,12,13])
        .should.be.false

    })
  })

  describe('merging', function(){

    it("is defined", function(){
      geofn.merge.should.be.a.Function
    })

    it('merges the same box', function(){
      geofn.merge([0,1,0,1],[0,1,0,1])
      .should.eql([0,1,0,1])
    })

    it('joins two boxes', function(){
      geofn.merge([0,1,0,1],[9,10,9,10])
      .should.eql([0,10,0,10])
    })

    it('works for other dimensions', function(){
      geofn.merge([0,1],[99,100])
        .should.eql([0,100])

      geofn.merge([0,1,10,20,1000,1100],[99,100,10,20,1050,2000])
        .should.eql([0,100,10,20,1000,2000])
    })

  })


  describe('grouping', function(){

    it("is defined", function(){
      geofn.group.should.be.a.Function
    })

    it('groups stuff', function(){

      geofn.group([
        [0,1,0,1],
        [10,20,0,1],
      ])
      .should.eql([0,1])

    })


    it('groups overlapping', function(){

      geofn.group([
        [0,1,0,1],
        [0,1,0,1],
        [10,20,0,1],
        [10,20,0,1],
      ])
      .should.eql([0,0,1,1])

    })


    it('groups things that become groups', function(){

      var boxes = [
        [0,1,   0,1],
        [2,3,   0,1],
        [10,11, 0,1],
        [14,15, 0,1]
      ];

      geofn
        .group(boxes)
        .should.eql([0,1,2,3])

      // includes first two
      boxes.push([0,5,0,1])

      geofn
        .group(boxes)
        .should.eql([0,0,1,2,0])

      // includes second two
      boxes.push([10,20,0,1])

      geofn
        .group(boxes)
        .should.eql([0,0,1,1,0,1])

      // covers all
      boxes.push([0,100,0,1])

      geofn
        .group(boxes)
        .should.eql([0,0,0,0,0,0,0])

    })

    // this was a problem before
    it('works for real data', function(){
      var boxes = [[-1.254379,-1.238573,51.744205,51.751968,57,67],[-1.246166,-1.235539,51.747713,51.760339,57,68],[-1.253282,-1.235598,51.747754,51.765006,57,68],[-1.297985,-1.238247,51.74409,51.781117,57,60],[-1.246228,-1.23551,51.74773,51.760472,57,68],[-1.239258,-1.220654,51.748338,51.756537,62,104],[-1.246074,-1.235617,51.747786,51.760371,57,67],[-1.256374,-1.239119,51.735469,51.751953,56,67],[-1.244753,-1.235659,51.747644,51.759087,58,68],[-1.242596,-1.231047,51.760575,51.770985,56,64],[-1.243769,-1.232206,51.74765,51.761333,58,80],[-1.238666,-1.230915,51.750856,51.769109,62,66],[-1.243385,-1.235846,51.747743,51.760124,58,66],[-1.251515,-1.235631,51.747753,51.762743,58,66],[-1.299237,-1.284513,51.714302,51.731557,112,157],[-1.251433,-1.233446,51.747677,51.762598,58,76],[-1.238657,-1.231199,51.748495,51.769294,62,68],[-1.250422,-1.2313,51.75442,51.773256,58,63],[-1.243758,-1.230775,51.747708,51.770385,58,67],[-1.257148,-1.235777,51.747728,51.764652,59,67],[-1.268202,-1.239737,51.735988,51.750403,57,66],[-1.269243,-1.229253,51.728508,51.750938,56,68],[-1.239194,-1.234911,51.74773,51.754258,65,72],[-1.258878,-1.232401,51.747723,51.764656,59,77],[-1.301756,-1.275104,51.714898,51.733212,104,168],[-1.239857,-1.231121,51.747801,51.769195,61,68],[-1.240998,-1.230697,51.7477,51.77533,59,65],[-1.259245,-1.230971,51.759957,51.775527,58,66],[-1.262596,-1.235483,51.748371,51.768023,58,68],[-1.238967,-1.23079,51.748992,51.769258,61,66],[-1.28307,-1.229727,51.747679,51.783529,58,68],[-1.253605,-1.235263,51.747728,51.764546,59,67],[-3.24498,-3.211979,55.943746,55.972912,21,63],[-1.2429767001664231,-1.2298026858444473,51.728383,51.747807734415716,56,68],[-1.263451,-1.230855,51.757736,51.775717,58,68],[-1.254071999999951,-1.2356100171966773,51.747707,51.76505690926229,59,65],[-1.2600266933441162,-1.248294711112976,51.75202667713165,51.76603317260742,60,73],[-1.2543336506616924,-1.2355421782710891,51.747721,51.765056190935496,59,66],[-1.2531460000000152,-1.2355695079345423,51.74784,51.765050087252135,59,66],[-1.238579,-1.230969,51.748424,51.769136,62,67]]
      geofn
        .group(boxes)
        .should.eql([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0 ])
    })

  })

  describe('expand', function(){

    it("is defined", function(){
      geofn.expand.should.be.a.Function
    })

    it('expands', function(){
      geofn.expand([-1, 1, -1, 1], 2)
        .should
        .eql([-2, 2, -2, 2])
    })

    it('contracts', function(){
      geofn.expand([-1, 1, -1, 1], .5)
        .should
        .eql([-.5, .5, -.5, .5])
    })

    it('deals with non 0,0 origins', function(){
      geofn.expand([20, 21, 20, 21], 3)
        .should
        .eql([19, 22, 19, 22])
    })
  })


  describe('centroid', function(){

    it("is defined", function(){
      geofn.centroid.should.be.a.Function
    })

    it('works for single items', function(){
      geofn.centroid([[1],[2],[3]])
        .should
        .eql([2])
    })

    it('works for more items', function(){
      geofn.centroid([[1,10],[2,20],[3,15]])
        .should
        .eql([2,15])
    })

  })


})
