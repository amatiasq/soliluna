import { ComponentClass, createElement, FC } from 'react';

export function withProps<
  Props extends {},
  ProvidedProps extends Partial<Props>
>(component: ComponentClass<Props> | FC<Props>, providedProps: ProvidedProps) {
  function ComponentWithProps(props: Omit<Props, keyof ProvidedProps>) {
    const finalProps = { ...providedProps, ...props };
    return createElement(component, finalProps as unknown as Props);
  }

  return Object.assign(ComponentWithProps, component);
}
