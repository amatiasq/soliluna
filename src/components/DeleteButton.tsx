import {
  Button,
  IconButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spacer,
  useDisclosure,
} from '@chakra-ui/react';
import { useCallback } from 'react';
import { FaTimes } from 'react-icons/fa';

let showModal = true;

export interface DeleteButtonProps {
  gridArea?: string;
  label: string;
  onConfirm: () => unknown;
}

export function DeleteButton({
  gridArea,
  label,
  onConfirm,
}: DeleteButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const confirm = useCallback(() => {
    onClose();
    onConfirm();
  }, [onConfirm]);

  const yesAll = useCallback(() => {
    showModal = false;
    confirm();
  }, [confirm]);

  return (
    <>
      <IconButton
        gridArea={gridArea}
        title={label}
        aria-label={label}
        icon={<FaTimes />}
        colorScheme="red"
        onClick={showModal ? onOpen : onConfirm}
      />

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{label}?</ModalHeader>
          <ModalCloseButton />

          <ModalFooter>
            <Button colorScheme="yellow" mr={3} onClick={yesAll}>
              Si a todo
            </Button>
            <Spacer />
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="red" mr={3} onClick={confirm}>
              Borrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

DeleteButton.displayName = 'DeleteButton';
