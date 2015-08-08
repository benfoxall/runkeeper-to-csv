describe('geo functions', function(){

  it("is defined", function(){
    geo.should.be.an.Object
  })

  describe('bounds', function(){

    it("is defined", function(){
      geo.bounds.should.be.a.Function
    })

    it('finds the min/max of a single value', function(){
      geo
        .bounds([[-1],[1],[2],[4],[3]])
        .should.eql([-1,4])
    })

    it('works for 2 dimensions', function(){
      geo
        .bounds([[-1,100],[2,95],[1,150]])
        .should.eql([-1,2,95,150])
    })

    it('works for 3 dimensions', function(){
      geo
        .bounds([[-1,100, 10],[2,95,20],[1,150,15]])
        .should.eql([-1,2,95,150,10,20])
    })

    it('works with weird data', function(){
      geo
        .bounds([[-1],[2,95,20],[1,150]])
        .should.eql([-1,2,95,150,20,20])
    })

    it('deals with zeros', function(){
      geo
        .bounds([[0],[3]])
        .should.eql([0,3])
    })

  })

  describe('intersect', function(){

    it("is defined", function(){
      geo.intersects.should.be.a.Function
    })

    it('works for overlapping boxes', function(){
      geo
        .intersects([0,1,0,1],[0,1,0,1])
        .should.be.true
    })

    it('works for non-connected boxes', function(){
      geo
        .intersects([0,1,0,1],[10,11,10,11])
        .should.be.false
    })


    it('works for other cases', function(){

      // inside
      geo
        .intersects([-1000,1000,-1000,1000],[-1,1,-1,1])
        .should.be.true

      // horizontal separate
      geo
        .intersects([-10,-9,-1,1],[9,10,-1,1])
        .should.be.false

    })

    xit('works in 3 dimensions', function(){

      geo
        .intersects([-1,1,20,30,-10,10],[-1,1,24,26,-100,100])
        .should.be.true

      geo
        .intersects([-1,1,20,30,10,11],[-1,1,24,26,12,13])
        .should.be.false

    })
  })

  describe('merging', function(){

    it("is defined", function(){
      geo.merge.should.be.a.Function
    })

    it('merges the same box', function(){
      geo.merge([0,1,0,1],[0,1,0,1])
      .should.eql([0,1,0,1])
    })

    it('joins two boxes', function(){
      geo.merge([0,1,0,1],[9,10,9,10])
      .should.eql([0,10,0,10])
    })

    it('works for other dimensions', function(){
      geo.merge([0,1],[99,100])
        .should.eql([0,100])

      geo.merge([0,1,10,20,1000,1100],[99,100,10,20,1050,2000])
        .should.eql([0,100,10,20,1000,2000])
    })

  })


  describe('grouping', function(){

    it("is defined", function(){
      geo.group.should.be.a.Function
    })

    it('groups stuff', function(){

      geo.group([
        [0,1,0,1],
        [10,20,0,1],
      ])
      .should.eql([0,1])

    })


    it('groups overlapping', function(){

      geo.group([
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

      geo
        .group(boxes)
        .should.eql([0,1,2,3])

      // includes first two
      boxes.push([0,5,0,1])

      geo
        .group(boxes)
        .should.eql([0,0,1,2,0])

      // includes second two
      boxes.push([10,20,0,1])

      geo
        .group(boxes)
        .should.eql([0,0,1,1,0,1])

      // covers all
      boxes.push([0,100,0,1])

      geo
        .group(boxes)
        .should.eql([0,0,0,0,0,0,0])

    })

  })

  describe('expand', function(){

    it("is defined", function(){
      geo.expand.should.be.a.Function
    })

    it('expands', function(){
      geo.expand([-1, 1, -1, 1], 2)
        .should
        .eql([-2, 2, -2, 2])
    })

    it('contracts', function(){
      geo.expand([-1, 1, -1, 1], .5)
        .should
        .eql([-.5, .5, -.5, .5])
    })

    it('deals with non 0,0 origins', function(){
      geo.expand([20, 21, 20, 21], 3)
        .should
        .eql([19, 22, 19, 22])
    })
  })


  describe('centroid', function(){

    it("is defined", function(){
      geo.centroid.should.be.a.Function
    })

    it('works for single items', function(){
      geo.centroid([[1],[2],[3]])
        .should
        .eql([2])
    })

    it('works for more items', function(){
      geo.centroid([[1,10],[2,20],[3,15]])
        .should
        .eql([2,15])
    })

  })


})
