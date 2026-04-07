Create a new game called speedrun.

The goal of the game is to mimic the joy that speedrunners get from incrementally 'solving' a game to get faster and faster times.

The game should work as follows:
- it is a 2d platformer
- the goal is to get from the start to some predetermined finish
- every week there is a brand new procedurally generated map
  - the map should fit on a single screen
  - the map should have two different kinds of colored coins, red and blue, in addition to the end goal state
- when a player completes a round, it should show the following times: any % completion (the player got to the end but did not get any coins); 100% red completion time (the player got to the end with all of the red coins); 100% blue completion time (the player got to the end with all of the blue coins)
- the goal of the game is 'expressivity'. We want players to have the same 'a-ha' moment that speedrunners or competitive rock climbers feel, where they do something that shaves off seconds or minutes by discovering a new route or trying something completely new
  - there should as a result be a lot of focus on really getting polished movement

We want to track basic stats for a player. We can for now store this on localhost (eventually we want to move to firebase).

Implement the game entirely in html, js, css. No need for a full game engine. Just make your own game engine loop.

Assets can just be basic shapes for now, we do not need complicated sprite maps and so on.

Put this in a new folder called ./speedrun/**
