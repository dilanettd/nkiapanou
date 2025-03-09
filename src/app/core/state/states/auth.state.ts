// import { State, Action, StateContext, Selector } from '@ngxs/store';
// import { Injectable } from '@angular/core';

// import { AuthStateModel, IUser } from '../../models/auth.state.model';
// import { GetMe, Login, Logout } from '../actions/auth.actions';

// @State<AuthStateModel>({
//   name: 'auth',
//   defaults: {
//     isAuthenticated: false,
//     accessToken: '',
//     refreshToken: '',
//     role: '',
//     me: null,
//   },
// })
// @Injectable()
// export class AuthState {
//   constructor() {}

//   @Selector()
//   static getMe(state: AuthStateModel): IUser | null {
//     return state.me;
//   }

//   @Selector()
//   static getAuthState(state: AuthStateModel): AuthStateModel {
//     return state;
//   }

//   @Action(GetMe)
//   getMe(ctx: StateContext<AuthStateModel>, action: GetMe) {
//     ctx.patchState({
//       me: action.me,
//     });
//   }

//   @Action(Login)
//   login(ctx: StateContext<AuthStateModel>, action: Login) {
//     const state = ctx.getState();
//     ctx.setState({
//       ...state,
//       isAuthenticated: true,
//       accessToken: action.payload.access_token,
//       refreshToken: action.payload.refresh_token,
//       role: action.payload.role,
//     });
//   }

//   @Action(Logout)
//   logout(ctx: StateContext<AuthStateModel>) {
//     ctx.setState({
//       isAuthenticated: false,
//       accessToken: '',
//       refreshToken: '',
//       role: '',
//       me: null,
//     });
//   }
// }
